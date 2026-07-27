import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { verifyPasskeyEnrollment } from "@/lib/api";
import { deletePasskey, getPasskeyErrorMessage, listPasskeys, registerPasskey, renamePasskey, type PasskeyRecord } from "@/lib/auth/passkeys";
import { authField, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius, shadows } from "@/lib/design";

export function PasskeyManagementSection() {
  const mounted = useRef(true);
  const running = useRef(false);
  const [items, setItems] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<PasskeyRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PasskeyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, []);

  async function refresh() {
    try {
      const next = await listPasskeys();
      if (!mounted.current) return;
      setItems(next);
      const verification = await verifyPasskeyEnrollment();
      if (verification.error) throw verification.error;
    } catch (caught) {
      if (mounted.current) setError(getPasskeyErrorMessage(caught, "manage"));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  async function add() {
    if (running.current) return;
    running.current = true;
    setBusyId("add");
    setError(null);
    setSuccess(null);
    try {
      await registerPasskey();
      await refresh();
      if (mounted.current) setSuccess("La clé d’accès a été ajoutée.");
    } catch (caught) {
      if (mounted.current) setError(getPasskeyErrorMessage(caught));
    } finally {
      running.current = false;
      if (mounted.current) setBusyId(null);
    }
  }

  function openRename(item: PasskeyRecord) {
    setError(null);
    setSuccess(null);
    setRenameValue(item.friendlyName);
    setRenaming(item);
  }

  async function saveRename() {
    if (!renaming || running.current) return;
    running.current = true;
    setBusyId(renaming.id);
    setError(null);
    try {
      await renamePasskey(renaming.id, renameValue);
      setRenaming(null);
      await refresh();
      if (mounted.current) setSuccess("Le nom de la clé d’accès a été enregistré.");
    } catch (caught) {
      if (mounted.current) setError(getPasskeyErrorMessage(caught, "manage"));
    } finally {
      running.current = false;
      if (mounted.current) setBusyId(null);
    }
  }

  async function remove() {
    if (!confirmDelete || running.current) return;
    running.current = true;
    setBusyId(confirmDelete.id);
    setError(null);
    setSuccess(null);
    try {
      await deletePasskey(confirmDelete.id);
      setConfirmDelete(null);
      await refresh();
      if (mounted.current) setSuccess("La clé d’accès a été supprimée.");
    } catch (caught) {
      if (mounted.current) setError(getPasskeyErrorMessage(caught, "manage"));
    } finally {
      running.current = false;
      if (mounted.current) setBusyId(null);
    }
  }

  return (
    <View nativeID="security" style={styles.section}>
      <View style={styles.divider} />
      <View style={styles.heading}>
        <Text style={styles.title}>Sécurité</Text>
        <Text style={styles.description}>Gérez les clés d’accès utilisées pour vous connecter à votre compte.</Text>
        <Text style={styles.help}>Une même clé d’accès peut être utilisée sur plusieurs appareils lorsqu’elle est synchronisée par votre gestionnaire de mots de passe. Vous pouvez également ajouter plusieurs clés d’accès à votre compte.</Text>
        <Text style={styles.help}>Toutes vos clés d’accès donnent accès au même compte. Elles ne créent pas de compte ou de droit de vote supplémentaire.</Text>
      </View>
      <View style={styles.listHeader}>
        <Text style={styles.subtitle}>Clés d’accès</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busyId === "add", busy: busyId === "add" }} disabled={busyId === "add"} onPress={() => void add()} style={({ pressed }) => StyleSheet.flatten([styles.primary, pressed && styles.primaryPressed, busyId === "add" && styles.disabled])}>
          {busyId === "add" ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.primaryText}>Ajouter une clé d’accès</Text>}
        </Pressable>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={palette.primaryStrong} /><Text style={styles.meta}>Chargement des clés d’accès</Text></View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Aucune clé d’accès supplémentaire n’est enregistrée.</Text>
      ) : (
        <View>
          {items.map((item) => (
            <View key={item.id} style={styles.passkeyRow}>
              <View style={styles.passkeyDetails}>
                <Text style={styles.passkeyName}>{item.friendlyName}</Text>
                <Text style={styles.meta}>Créée le {formatDate(item.createdAt)}{item.lastUsedAt ? ` · Dernière utilisation le ${formatDate(item.lastUsedAt)}` : ""}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={() => openRename(item)} style={({ pressed }) => StyleSheet.flatten([styles.textAction, pressed && styles.actionPressed])}><Text style={styles.actionText}>Renommer</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(item)} style={({ pressed }) => StyleSheet.flatten([styles.textAction, pressed && styles.actionPressed])}><Text style={styles.deleteText}>Supprimer</Text></Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
      <ManagementModal visible={Boolean(renaming)} title="Renommer la clé d’accès" onClose={() => !busyId && setRenaming(null)}>
        <TextInput accessibilityLabel="Nom de la clé d’accès" autoFocus maxLength={120} value={renameValue} onChangeText={setRenameValue} style={styles.input} />
        <ModalActions loading={Boolean(busyId)} destructive={false} confirmLabel="Enregistrer" onCancel={() => setRenaming(null)} onConfirm={() => void saveRename()} />
      </ManagementModal>
      <ManagementModal visible={Boolean(confirmDelete)} title="Supprimer cette clé d’accès ?" onClose={() => !busyId && setConfirmDelete(null)}>
        <Text style={styles.modalText}>« {confirmDelete?.friendlyName} » ne permettra plus d’accéder à votre compte.</Text>
        <ModalActions loading={Boolean(busyId)} destructive confirmLabel="Supprimer" onCancel={() => setConfirmDelete(null)} onConfirm={() => void remove()} />
      </ManagementModal>
    </View>
  );
}

function ManagementModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><Pressable accessibilityLabel="Fermer" style={styles.scrim} onPress={onClose} /><View style={styles.modal}><Text style={styles.modalTitle}>{title}</Text>{children}</View></View></Modal>;
}

function ModalActions({ loading, destructive, confirmLabel, onCancel, onConfirm }: { loading: boolean; destructive: boolean; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return <View style={styles.modalActions}><Pressable accessibilityRole="button" disabled={loading} onPress={onCancel} style={styles.cancelAction}><Text style={styles.actionText}>Annuler</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onConfirm} style={styles.confirmAction}>{loading ? <ActivityIndicator color={destructive ? palette.dangerText : palette.primaryStrong} /> : <Text style={destructive ? styles.deleteText : styles.confirmText}>{confirmLabel}</Text>}</Pressable></View>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const styles = StyleSheet.create({
  section: { width: "100%", maxWidth: 720, gap: 24, paddingTop: 28 },
  divider: { height: 1, width: "100%", backgroundColor: palette.line },
  heading: { gap: 8 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 26, lineHeight: 32 },
  description: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22 },
  help: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 19 },
  listHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 },
  subtitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 18, lineHeight: 24 },
  primary: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  primaryPressed: { backgroundColor: palette.primaryPressed, transform: [{ translateY: 1 }] },
  primaryText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  disabled: { opacity: 0.58 },
  passkeyRow: { minHeight: 76, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: palette.line, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 24, rowGap: 12 },
  passkeyDetails: { flex: 1, minWidth: 220, gap: 5 },
  passkeyName: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 15, lineHeight: 21 },
  meta: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16 },
  textAction: { minHeight: 40, justifyContent: "center", paddingHorizontal: 2 },
  actionText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 },
  deleteText: { color: palette.dangerText, fontFamily: fontFamilySemibold, fontSize: 13 },
  actionPressed: { opacity: 0.62 },
  loading: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: palette.line },
  empty: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: palette.line },
  error: { color: palette.dangerText, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20 },
  success: { color: palette.positiveText, fontFamily: fontFamilyMedium, fontSize: 13, lineHeight: 20 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.68)" },
  modal: { width: "100%", maxWidth: 430, borderRadius: radius.md, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, padding: 22, gap: 16, ...shadows.panel },
  modalTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 21, lineHeight: 27 },
  modalText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22 },
  input: { minHeight: 46, backgroundColor: authField.background, color: palette.ink, borderRadius: authField.borderRadius, borderWidth: 1, borderColor: authField.focusBorderColor, paddingHorizontal: 13, fontFamily: fontFamilyMedium },
  modalActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 16 },
  cancelAction: { minHeight: 42, justifyContent: "center", paddingHorizontal: 4 },
  confirmAction: { minHeight: 42, minWidth: 90, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  confirmText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 }
});
