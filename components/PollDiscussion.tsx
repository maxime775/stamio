import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Heart, ImagePlus, MessageCircle, Send, X } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@/components/AuthProvider";
import {
  createPollComment,
  getPollComments,
  removePollCommentImage,
  togglePollCommentLike,
  uploadPollCommentImage
} from "@/lib/api";
import { fontFamily, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import type { PollComment, PollCommentImage } from "@/lib/types";

export function PollDiscussion({ pollId }: { pollId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<PollComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"recent" | "popular">("popular");
  const [replyTo, setReplyTo] = useState<PollComment | null>(null);

  async function refresh() {
    setComments(await getPollComments(pollId));
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPollComments(pollId).then((items) => {
      if (!active) return;
      setComments(items);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [pollId]);

  async function like(comment: PollComment) {
    if (!user) return router.push("/auth/signup" as Href);
    await togglePollCommentLike(comment.id);
    await refresh();
  }

  const { roots, repliesByParent } = useMemo(() => {
    const rootComments: PollComment[] = [];
    const replies = new Map<string, PollComment[]>();
    for (const comment of comments) {
      if (!comment.parent_comment_id) {
        rootComments.push(comment);
      } else {
        replies.set(comment.parent_comment_id, [...(replies.get(comment.parent_comment_id) ?? []), comment]);
      }
    }
    for (const [parentId, parentReplies] of replies) {
      replies.set(parentId, parentReplies.sort((a, b) => a.created_at.localeCompare(b.created_at)));
    }
    return {
      roots: rootComments.sort((a, b) => sort === "popular"
      ? b.likes - a.likes || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at)),
      repliesByParent: replies
    };
  }, [comments, sort]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Discussion</Text>
          <Text style={styles.title}>Le débat continue ici</Text>
          <Text style={styles.subtitle}>{comments.length} contribution{comments.length > 1 ? "s" : ""} · lecture ouverte à tous</Text>
        </View>
        <View style={styles.sort}>
          <SortButton label="Populaires" active={sort === "popular"} onPress={() => setSort("popular")} />
          <SortButton label="Récentes" active={sort === "recent"} onPress={() => setSort("recent")} />
        </View>
      </View>

      {user ? (
        <CommentComposer pollId={pollId} parent={replyTo} onCancel={() => setReplyTo(null)} onCreated={async () => { setReplyTo(null); await refresh(); }} />
      ) : (
        <View style={styles.signupCta}>
          <View style={styles.signupCopy}><Text style={styles.signupTitle}>Envie de participer ?</Text><Text style={styles.signupText}>Inscrivez-vous pour participer au débat.</Text></View>
          <Pressable onPress={() => router.push("/auth/signup" as Href)} style={({ pressed }) => StyleSheet.flatten([styles.primary, pressed && styles.pressed])}><Text style={styles.primaryText}>S’inscrire</Text></Pressable>
        </View>
      )}

      {loading ? <DiscussionSkeleton /> : roots.length === 0 ? (
        <View style={styles.empty}><MessageCircle size={24} color={palette.muted} /><Text style={styles.emptyTitle}>Ouvrez la discussion</Text><Text style={styles.emptyText}>Aucun commentaire pour le moment.</Text></View>
      ) : (
        <View style={styles.list}>
          {roots.map((comment) => (
            <View key={comment.id} style={styles.thread}>
              <CommentItem comment={comment} authenticated={Boolean(user)} onLike={() => like(comment)} onReply={() => user ? setReplyTo(comment) : router.push("/auth/signup" as Href)} />
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                <View key={reply.id} style={styles.reply}><CommentItem comment={reply} authenticated={Boolean(user)} onLike={() => like(reply)} onReply={() => user ? setReplyTo(comment) : router.push("/auth/signup" as Href)} /></View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function DiscussionSkeleton() {
  return <View style={styles.loadingDiscussion}>
    {[0, 1].map((index) => <View key={index} style={styles.loadingComment}>
      <View style={styles.loadingMeta} />
      <View style={styles.loadingLine} />
      <View style={styles.loadingLineShort} />
    </View>)}
  </View>;
}

type SelectedImage = Omit<PollCommentImage, "path"> & { uri: string; base64: string };

function CommentComposer({ pollId, parent, onCancel, onCreated }: { pollId: string; parent: PollComment | null; onCancel: () => void; onCreated: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.9, base64: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = normalizeImageMimeType(asset.mimeType);
    if (!asset.base64 || !mimeType) {
      setError("Format non pris en charge. Utilisez une image JPEG, PNG ou WebP.");
      return;
    }
    const size = getBase64ByteLength(asset.base64);
    if (size < 1 || size > 5 * 1024 * 1024) {
      setError("L’image doit peser moins de 5 Mo.");
      return;
    }
    setImage({ uri: asset.uri, base64: asset.base64, mimeType, size });
  }

  async function submit() {
    const clean = body.trim();
    if (!clean) return;
    setSending(true);
    setError(null);
    let uploadedImage: PollCommentImage | undefined;
    try {
      if (image) uploadedImage = await uploadPollCommentImage(pollId, image.base64, image.mimeType, image.size);
      const { error: submitError } = await createPollComment(pollId, clean, parent?.id ?? null, uploadedImage);
      if (submitError) {
        if (uploadedImage) await removePollCommentImage(uploadedImage.path);
        setError("Impossible de publier ce commentaire.");
        return;
      }
      setBody("");
      setImage(null);
      await onCreated();
    } catch {
      if (uploadedImage) await removePollCommentImage(uploadedImage.path);
      setError("Impossible d’envoyer l’image. Vérifiez son format et sa taille.");
    } finally {
      setSending(false);
    }
  }

  return <View style={styles.composer}>
    {parent ? <View style={styles.replying}><Text style={styles.replyingText}>Réponse à {parent.author_label}</Text><Pressable onPress={onCancel}><Text style={styles.cancel}>Annuler</Text></Pressable></View> : null}
    <TextInput value={body} onChangeText={setBody} multiline maxLength={2000} placeholder="Partagez un point de vue argumenté…" placeholderTextColor="#697A91" style={styles.input} />
    {image ? <View style={styles.imagePreviewWrap}>
      <Image source={{ uri: image.uri }} resizeMode="contain" style={styles.imagePreview} accessibilityLabel="Aperçu de l’image à publier" />
      <Pressable disabled={sending} onPress={() => setImage(null)} accessibilityRole="button" accessibilityLabel="Retirer l’image" style={({ pressed }) => StyleSheet.flatten([styles.removeImage, pressed && styles.pressed])}><X size={17} color="#FFFFFF" /></Pressable>
    </View> : null}
    <View style={styles.composerBottom}>
      <Pressable disabled={sending} onPress={pickImage} accessibilityRole="button" accessibilityLabel={image ? "Remplacer l’image" : "Ajouter une image"} style={({ pressed }) => StyleSheet.flatten([styles.addImage, sending && styles.disabled, pressed && styles.pressed])}><ImagePlus size={17} color={palette.primaryStrong} /></Pressable>
      <Text style={styles.counter}>{body.length}/2000</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={sending || !body.trim()} onPress={submit} style={({ pressed }) => StyleSheet.flatten([styles.send, (!body.trim() || sending) && styles.disabled, pressed && styles.pressed])}>{sending ? <ActivityIndicator color="#F8FAFC" /> : <><Send size={15} color="#F8FAFC" /><Text style={styles.sendText}>Publier</Text></>}</Pressable>
    </View>
  </View>;
}

function normalizeImageMimeType(mimeType?: string | null): PollCommentImage["mimeType"] | null {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp" ? mimeType : null;
}

function getBase64ByteLength(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function CommentItem({ comment, authenticated, onLike, onReply }: { comment: PollComment; authenticated: boolean; onLike: () => void; onReply: () => void }) {
  const date = new Date(comment.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return <View style={styles.comment}>
    <View style={styles.commentMeta}><View style={styles.avatar}><Text style={styles.avatarText}>{comment.author_label.slice(0, 1)}</Text></View><Text style={styles.author}>{comment.author_label}</Text><Text style={styles.date}>{date}</Text></View>
    <Text style={StyleSheet.flatten([styles.body, comment.deleted_at && styles.deleted])}>{comment.body}</Text>
    {comment.image_url && !comment.deleted_at ? <Image source={{ uri: comment.image_url }} resizeMode="contain" style={styles.commentImage} accessibilityLabel="Image jointe au commentaire" /> : null}
    {!comment.deleted_at ? <View style={styles.actions}>
      <Pressable onPress={onLike} accessibilityLabel={authenticated ? "Aimer ce commentaire" : "S’inscrire pour aimer"} style={styles.action}><Heart size={14} color={comment.liked_by_me ? palette.danger : palette.muted} fill={comment.liked_by_me ? palette.danger : "transparent"} /><Text style={styles.actionText}>{comment.likes}</Text></Pressable>
      <Pressable onPress={onReply} style={styles.action}><MessageCircle size={14} color={palette.muted} /><Text style={styles.actionText}>Répondre</Text></Pressable>
    </View> : null}
  </View>;
}

function SortButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={StyleSheet.flatten([styles.sortButton, active && styles.sortActive])}><Text style={StyleSheet.flatten([styles.sortText, active && styles.sortTextActive])}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, borderLeftWidth: 3, borderLeftColor: palette.primary, backgroundColor: palette.surfaceSubtle, padding: 24, gap: 22 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 25, letterSpacing: -0.5, marginTop: 5 },
  subtitle: { color: palette.muted, fontFamily, marginTop: 5 },
  sort: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: palette.line },
  sortButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 0 },
  sortActive: { borderBottomWidth: 2, borderBottomColor: palette.primaryStrong },
  sortText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  sortTextActive: { color: palette.ink },
  signupCta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, padding: 16, borderRadius: radius.sm, backgroundColor: palette.primarySoft, borderWidth: 1, borderColor: palette.lineStrong },
  signupCopy: { flex: 1, minWidth: 240, gap: 3 }, signupTitle: { color: palette.ink, fontFamily: fontFamilySemibold }, signupText: { color: palette.muted, lineHeight: 20 },
  primary: { minHeight: 40, justifyContent: "center", paddingHorizontal: 15, borderRadius: radius.sm, backgroundColor: palette.primary }, primaryText: { color: "#FFFFFF", fontFamily: fontFamilySemibold },
  pressed: { transform: [{ translateY: 1 }, { scale: 0.99 }] },
  composer: { borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.surface, padding: 16, gap: 12 },
  replying: { flexDirection: "row", justifyContent: "space-between" }, replyingText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 12 }, cancel: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12 },
  input: { minHeight: 96, color: palette.ink, fontSize: 15, lineHeight: 22, textAlignVertical: "top" },
  imagePreviewWrap: { position: "relative", alignSelf: "stretch", overflow: "hidden", borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.canvas },
  imagePreview: { width: "100%", height: 240 },
  removeImage: { position: "absolute", top: 10, right: 10, width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: "rgba(5,8,12,0.9)", borderWidth: 1, borderColor: palette.lineStrong },
  composerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 10 },
  addImage: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: "transparent" },
  counter: { color: "#65758A", fontSize: 11 }, error: { color: "#E8A0A0", flex: 1, minWidth: 180, fontSize: 12 },
  send: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: palette.primary }, sendText: { color: "#FFFFFF", fontFamily: fontFamilySemibold }, disabled: { opacity: 0.45 },
  list: { borderTopWidth: 1, borderTopColor: palette.line }, thread: { gap: 0 }, reply: { marginLeft: 24, borderLeftWidth: 1, borderLeftColor: palette.lineStrong, paddingLeft: 14 },
  loadingDiscussion: { gap: 12 },
  loadingComment: { borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 16, gap: 10 },
  loadingMeta: { width: 160, height: 10, borderRadius: radius.xs, backgroundColor: palette.lineStrong },
  loadingLine: { width: "86%", height: 13, borderRadius: radius.xs, backgroundColor: palette.line },
  loadingLineShort: { width: "54%", height: 13, borderRadius: radius.xs, backgroundColor: palette.line },
  comment: { borderRadius: 0, backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: palette.line, paddingVertical: 18, paddingHorizontal: 2, gap: 11, overflow: "hidden" },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8 }, avatar: { width: 26, height: 26, borderRadius: radius.xs, alignItems: "center", justifyContent: "center", backgroundColor: palette.surfaceRaised }, avatarText: { color: palette.inkSecondary, fontFamily: fontFamilySemibold, fontSize: 12 }, author: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 13 }, date: { color: palette.muted, fontSize: 11 },
  body: { color: "#C8D2E1", lineHeight: 22, fontSize: 14 }, deleted: { color: "#718096", fontStyle: "italic" },
  commentImage: { width: "100%", height: 280, maxWidth: 680, alignSelf: "flex-start", borderRadius: radius.sm, backgroundColor: palette.canvas, overflow: "hidden" },
  actions: { flexDirection: "row", gap: 18 }, action: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3 }, actionText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 30, gap: 6 }, emptyTitle: { color: palette.ink, fontFamily: fontFamilySemibold }, emptyText: { color: palette.muted }
});
