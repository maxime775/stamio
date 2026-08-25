import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Archive, ArrowRight, CheckCircle2, Eye, EyeOff, FileText, Pencil, Plus, RefreshCw, Square, Trash2, XCircle } from "@/lib/icons";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/components/AuthProvider";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import {
  adminClosePoll,
  adminCreatePoll,
  adminDeleteOrArchivePoll,
  adminGetPoll,
  adminListPolls,
  adminRelaunchPoll,
  adminSetPollResultsVisibility,
  adminUpdatePoll,
  getAdminStatus
} from "@/lib/api";
import { THEMES, getThemeLabel } from "@/lib/product";
import { MAX_POLL_DESCRIPTION_LENGTH, validatePollDescription } from "@/lib/pollDescription";
import type { AdminCreatePollInput, AdminPollSummary, AdminSeriesSummary, PollResourceInput, PollResourceType, ThemeSlug } from "@/lib/types";
import { authField, fontFamilyBold, fontFamilyMedium, fontFamilySemibold, palette, radius } from "@/lib/design";
import { createPollSeriesSlug, getPollPublicPath, getQuestionPath, validatePollSeriesSlug } from "@/lib/publicPollUrls";

const DEFAULT_CHOICES = ["Oui", "Non", "Ne se prononce pas"];
const RESOURCE_TYPES: Array<{ label: string; value: PollResourceType }> = [
  { label: "Lien", value: "link" },
  { label: "PDF", value: "pdf" },
  { label: "Article", value: "article" },
  { label: "Rapport", value: "report" },
  { label: "Autre", value: "other" }
];
const DURATION_OPTIONS = [
  { label: "3 jours", value: "3" },
  { label: "5 jours", value: "5" },
  { label: "7 jours", value: "7" },
  { label: "14 jours", value: "14" },
  { label: "Personnalise", value: "custom" }
] as const;

type AdminState = "loading" | "allowed" | "denied";
type AdminTab = "open" | "archives" | "series" | "create";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [adminState, setAdminState] = useState<AdminState>("loading");
  const [tab, setTab] = useState<AdminTab>("open");
  const [polls, setPolls] = useState<AdminPollSummary[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [editingVotes, setEditingVotes] = useState(0);
  const [theme, setTheme] = useState<ThemeSlug>("politique");
  const [question, setQuestion] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [choices, setChoices] = useState(DEFAULT_CHOICES);
  const [includeResources, setIncludeResources] = useState(false);
  const [resources, setResources] = useState<PollResourceInput[]>([]);
  const [duration, setDuration] = useState<(typeof DURATION_OPTIONS)[number]["value"]>("7");
  const [customDays, setCustomDays] = useState("10");
  const [status, setStatus] = useState<AdminCreatePollInput["status"]>("open");
  const [featured, setFeatured] = useState(false);
  const [showInResults, setShowInResults] = useState(false);
  const [relaunchDays, setRelaunchDays] = useState("7");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdPollId, setCreatedPollId] = useState<string | null>(null);
  const [createdPublicPath, setCreatedPublicPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => {
      active = false;
    };
    if (!userId) {
      setAdminState("denied");
      return () => {
        active = false;
      };
    }
    setAdminState("loading");
    getAdminStatus().then((isAdmin) => {
      if (active) setAdminState(isAdmin ? "allowed" : "denied");
    });
    return () => {
      active = false;
    };
  }, [authLoading, userId]);

  const reloadPolls = useCallback(async () => {
    setLoadingPolls(true);
    const items = await adminListPolls();
    setPolls(items);
    setLoadingPolls(false);
  }, []);

  useEffect(() => {
    if (adminState !== "allowed") return;
    void reloadPolls();
  }, [adminState, reloadPolls]);

  const cleanedChoices = useMemo(() => choices.map((choice) => choice.trim()).filter(Boolean), [choices]);
  const openPolls = useMemo(() => polls.filter((poll) => poll.status === "open" && !poll.archived), [polls]);
  const archivePolls = useMemo(() => polls.filter((poll) => poll.status === "closed" || poll.archived), [polls]);
  const series = useMemo(() => buildSeries(polls), [polls]);

  if (authLoading || adminState === "loading") {
    return <PageShell compact><View style={styles.notice}><ActivityIndicator color={palette.primaryStrong} /><Text style={styles.noticeText}>Verification de l'acces admin...</Text></View></PageShell>;
  }

  if (!user) {
    return (
      <PageShell compact>
        <View style={styles.notice}>
          <Text style={styles.title}>Administration</Text>
          <Text style={styles.noticeText}>Connectez-vous avec un compte autorise pour acceder a la gestion des sondages.</Text>
          <Pressable onPress={() => router.push("/auth/login" as Href)} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Se connecter</Text>
          </Pressable>
        </View>
      </PageShell>
    );
  }

  if (adminState === "denied") {
    return (
      <PageShell compact>
        <View style={styles.notice}>
          <Text style={styles.title}>Acces non autorise</Text>
          <Text style={styles.noticeText}>Votre compte est connecte, mais il n'est pas declare administrateur dans Supabase.</Text>
        </View>
      </PageShell>
    );
  }

  async function submit() {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      setCreatedPollId(null);
      return;
    }

    const closesAt = computeClosesAt();
    if (!closesAt) {
      setFormError("Choisissez une duree valide.");
      setCreatedPollId(null);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setActionError(null);
    setActionMessage(null);
    setCreatedPollId(null);

    if (editingPollId) {
      const response = await adminUpdatePoll({
        poll_id: editingPollId,
        question: question.trim(),
        description: description.trim(),
        theme,
        choices: cleanedChoices,
        choice_keys: deriveChoiceKeys(cleanedChoices),
        closes_at: closesAt,
        status,
        featured,
        show_in_results: status === "closed" ? showInResults : false,
        resources: includeResources ? normalizeResources(resources) : []
      });
      setSubmitting(false);
      if (!response.ok) {
        setFormError(response.error ?? "La mise a jour a echoue.");
        return;
      }
      setActionMessage("Sondage mis a jour.");
      resetForm();
      setTab("open");
      await reloadPolls();
      return;
    }

    const response = await adminCreatePoll({
      slug,
      question: question.trim(),
      description: description.trim(),
      theme,
      choices: cleanedChoices,
      choice_keys: deriveChoiceKeys(cleanedChoices),
      closes_at: closesAt,
      status,
      featured,
      show_in_results: status === "closed" ? showInResults : false,
      resources: includeResources ? normalizeResources(resources) : []
    });
    setSubmitting(false);

    if (!response.pollId) {
      setFormError(response.error ?? "La creation du sondage a echoue.");
      return;
    }

    setCreatedPollId(response.pollId);
    setCreatedPublicPath(getQuestionPath(slug));
    setActionMessage("Nouvelle serie creee avec sa premiere vague.");
    await reloadPolls();
  }

  function validateForm() {
    if (!question.trim()) return "La question est obligatoire.";
    if (!editingPollId) {
      const slugError = validatePollSeriesSlug(slug);
      if (slugError) return slugError;
    }
    if (!description.trim()) return "Le texte d'enjeux est obligatoire.";
    const descriptionError = validatePollDescription(description);
    if (descriptionError) return descriptionError;
    if (cleanedChoices.length < 2) return "Ajoutez au moins deux choix.";
    if (cleanedChoices.length > 6) return "Limitez le sondage a six choix maximum.";
    if (new Set(cleanedChoices).size !== cleanedChoices.length) return "Les choix ne doivent pas contenir de doublon exact.";
    if (!computeClosesAt()) return "Choisissez une duree valide.";
    if (includeResources) {
      const resourceError = validateResources(resources);
      if (resourceError) return resourceError;
    }
    return null;
  }

  function computeClosesAt(daysOverride?: string) {
    const rawDays = daysOverride ?? (duration === "custom" ? customDays : duration);
    const days = Number(rawDays);
    if (!Number.isFinite(days) || days < 1 || days > 90) return null;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  function updateChoice(index: number, value: string) {
    setChoices((current) => current.map((choice, choiceIndex) => choiceIndex === index ? value : choice));
  }

  function removeChoice(index: number) {
    setChoices((current) => current.filter((_choice, choiceIndex) => choiceIndex !== index));
  }

  function resetForm() {
    setEditingPollId(null);
    setEditingVotes(0);
    setQuestion("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setChoices(DEFAULT_CHOICES);
    setIncludeResources(false);
    setResources([]);
    setDuration("7");
    setCustomDays("10");
    setStatus("open");
    setFeatured(false);
    setShowInResults(false);
    setFormError(null);
    setCreatedPollId(null);
    setCreatedPublicPath(null);
  }

  async function startEdit(poll: AdminPollSummary) {
    setActionError(null);
    setActionMessage(null);
    const detail = await adminGetPoll(poll.id);
    if (!detail) {
      setActionError("Impossible de charger le detail du sondage.");
      return;
    }
    setEditingPollId(poll.id);
    setEditingVotes(Number(detail.total_votes ?? poll.total_votes ?? 0));
    setQuestion(detail.poll.question);
    setSlug(detail.series?.slug ?? poll.series_slug ?? "");
    setSlugTouched(true);
    setDescription(detail.poll.description ?? "");
    setTheme((detail.poll.theme ?? poll.theme) as ThemeSlug);
    setChoices(detail.choices.length > 0 ? detail.choices.map((choice) => choice.label) : DEFAULT_CHOICES);
    setStatus(detail.poll.status);
    setFeatured(Boolean(detail.poll.featured));
    setShowInResults(Boolean(detail.poll.show_in_results));
    const loadedResources = (detail.resources ?? detail.poll.resources ?? []).map((resource) => ({
      title: resource.title,
      url: resource.url,
      resource_type: resource.resource_type,
      description: resource.description ?? ""
    }));
    setResources(loadedResources);
    setIncludeResources(loadedResources.length > 0);
    setDuration("7");
    setCustomDays("10");
    setTab("create");
  }

  async function runAction(action: () => Promise<{ ok?: boolean; error?: string } | { pollId: string | null; error?: string } | { action: string | null; error?: string }>, success: string) {
    setActionError(null);
    setActionMessage(null);
    const response = await action();
    if ("error" in response && response.error) {
      setActionError(response.error);
      return;
    }
    setActionMessage(success);
    await reloadPolls();
  }

  async function closePoll(pollId: string) {
    await runAction(() => adminClosePoll(pollId), "Sondage cloture. Il n'est pas publie automatiquement dans les derniers resultats.");
  }

  async function relaunchPoll(pollId: string) {
    const closesAt = computeClosesAt(relaunchDays);
    if (!closesAt) {
      setActionError("La duree de relance doit etre comprise entre 1 et 90 jours.");
      return;
    }
    await runAction(() => adminRelaunchPoll({ poll_id: pollId, closes_at: closesAt, status: "open", featured: false }), "Nouvelle vague creee avec un nouveau poll_id.");
  }

  async function setResultsVisibility(pollId: string, visible: boolean) {
    await runAction(() => adminSetPollResultsVisibility(pollId, visible), visible ? "Vague visible dans Derniers resultats." : "Vague retiree des Derniers resultats.");
  }

  async function archiveOrDelete(pollId: string) {
    await runAction(() => adminDeleteOrArchivePoll(pollId), "Sondage supprime s'il etait vide, sinon archive.");
  }

  function toggleResources() {
    if (!includeResources) {
      setIncludeResources(true);
      if (resources.length === 0) setResources([createEmptyResource()]);
      return;
    }

    const hasContent = resources.some((resource) => resource.title.trim() || resource.url.trim() || (resource.description ?? "").trim());
    if (editingPollId && hasContent) {
      Alert.alert(
        "Retirer les ressources ?",
        "En enregistrant avec cette option desactivee, les ressources rattachees a cette question seront supprimees.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Retirer", style: "destructive", onPress: () => setIncludeResources(false) }
        ]
      );
      return;
    }
    setIncludeResources(false);
  }

  function updateResource(index: number, patch: Partial<PollResourceInput>) {
    setResources((current) => current.map((resource, resourceIndex) => resourceIndex === index ? { ...resource, ...patch } : resource));
  }

  function removeResource(index: number) {
    setResources((current) => current.filter((_resource, resourceIndex) => resourceIndex !== index));
  }

  return (
    <PageShell compact>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Administration</Text>
            <Text style={styles.title}>Gestion des sondages</Text>
            <Text style={styles.subtitle}>Chaque relance cree une nouvelle vague rattachee a la meme serie. Les anciens votes et resultats restent intacts.</Text>
          </View>
          <Pressable onPress={() => { resetForm(); setTab("create"); }} style={styles.primaryAction}>
            <Plus size={16} color={palette.onPrimary} />
            <Text style={styles.primaryActionText}>Creer une question</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <TabButton label={`Ouvertes (${openPolls.length})`} active={tab === "open"} onPress={() => setTab("open")} />
          <TabButton label={`Archives (${archivePolls.length})`} active={tab === "archives"} onPress={() => setTab("archives")} />
          <TabButton label={`Series (${series.length})`} active={tab === "series"} onPress={() => setTab("series")} />
          <TabButton label={editingPollId ? "Modifier" : "Creer"} active={tab === "create"} onPress={() => setTab("create")} />
        </View>

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        {actionMessage ? <Text style={styles.successMessage}>{actionMessage}</Text> : null}

        {loadingPolls ? <View style={styles.loadingLine}><ActivityIndicator color={palette.primaryStrong} /><Text style={styles.noticeText}>Chargement des sondages...</Text></View> : null}

        {tab === "open" ? (
          <PollList
            polls={openPolls}
            emptyLabel="Aucune question ouverte."
            relaunchDays={relaunchDays}
            setRelaunchDays={setRelaunchDays}
            onView={(poll) => router.push(getAdminPollHref(poll) as Href)}
            onEdit={startEdit}
            onClose={closePoll}
            onRelaunch={relaunchPoll}
            onVisibility={setResultsVisibility}
            onArchive={archiveOrDelete}
          />
        ) : null}

        {tab === "archives" ? (
          <PollList
            polls={archivePolls}
            emptyLabel="Aucune archive."
            relaunchDays={relaunchDays}
            setRelaunchDays={setRelaunchDays}
            onView={(poll) => router.push(getAdminPollHref(poll) as Href)}
            onEdit={startEdit}
            onClose={closePoll}
            onRelaunch={relaunchPoll}
            onVisibility={setResultsVisibility}
            onArchive={archiveOrDelete}
          />
        ) : null}

        {tab === "series" ? (
          <View style={styles.list}>
            {series.length > 0 ? series.map((item) => (
              <View key={item.series_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.meta}>{getThemeLabel(item.theme)} - {item.waveCount} vague{item.waveCount > 1 ? "s" : ""}</Text>
                    <Text style={styles.cardTitle}>{item.question}</Text>
                    <Text style={styles.cardText}>Derniere vague #{item.lastWave.wave_number ?? 1} - {item.lastWave.status} - {formatDate(item.lastWave.closes_at)}</Text>
                  </View>
                  <Pressable onPress={() => void relaunchPoll(item.lastWave.id)} style={styles.secondaryAction}>
                    <RefreshCw size={15} color={palette.primaryStrong} />
                    <Text style={styles.secondaryActionText}>Nouvelle vague</Text>
                  </Pressable>
                </View>
                <View style={styles.waveList}>
                  {item.polls.map((poll) => <Text key={poll.id} style={styles.waveLine}>Vague #{poll.wave_number ?? 1} - {poll.status} - {poll.total_votes} votes - {poll.show_in_results ? "visible resultats" : "hors resultats"}</Text>)}
                </View>
              </View>
            )) : <Text style={styles.emptyText}>Aucune serie disponible.</Text>}
          </View>
        ) : null}

        {tab === "create" ? (
          <View style={styles.form}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.sectionTitle}>{editingPollId ? "Modifier une vague" : "Creer une question"}</Text>
                <Text style={styles.cardText}>
                  {editingPollId
                    ? editingVotes > 0 ? "Ce sondage a deja des votes : les choix et le sens de la question sont proteges cote RPC." : "Aucun vote detecte : les choix peuvent encore etre ajustes."
                    : "Une nouvelle serie est creee automatiquement avec la premiere vague."}
                </Text>
              </View>
              {editingPollId ? <Pressable onPress={resetForm} style={styles.secondaryAction}><XCircle size={15} color={palette.primaryStrong} /><Text style={styles.secondaryActionText}>Annuler</Text></Pressable> : null}
            </View>

            <Field label="Theme">
              <View style={styles.segmentRow}>
                {THEMES.map((item) => {
                  const active = theme === item.slug;
                  return (
                    <Pressable key={item.slug} onPress={() => setTheme(item.slug)} style={StyleSheet.flatten([styles.segment, active && styles.segmentActive])}>
                      <Text style={StyleSheet.flatten([styles.segmentText, active && styles.segmentTextActive])}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="Question">
              <TextInput
                value={question}
                onChangeText={(value) => {
                  setQuestion(value);
                  if (!editingPollId && !slugTouched) setSlug(createPollSeriesSlug(value));
                }}
                placeholder="Ex. Faut-il..."
                placeholderTextColor={authField.placeholderColor}
                style={styles.input}
              />
            </Field>

            <Field label="Slug public de la série">
              <TextInput
                value={slug}
                editable={!editingPollId}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
                  setSlugTouched(true);
                  setSlug(value);
                }}
                placeholder="question-lisible-et-stable"
                placeholderTextColor={authField.placeholderColor}
                style={StyleSheet.flatten([styles.input, editingPollId && styles.disabled])}
              />
            </Field>

            <Field label="Enjeux / description">
              <MarkdownEditor
                value={description}
                onChangeText={setDescription}
                placeholder="Expliquez le contexte du debat..."
                characterLimit={MAX_POLL_DESCRIPTION_LENGTH}
              />
            </Field>

            <View style={styles.checkboxGrid}>
              <Checkbox label="Inclure ressources" value={includeResources} onToggle={toggleResources} />
            </View>

            {includeResources ? (
              <Field label="Ressources">
                <View style={styles.resourceList}>
                  {resources.map((resource, index) => (
                    <View key={index} style={styles.resourceCard}>
                      <View style={styles.resourceHeader}>
                        <View style={styles.resourceTitleRow}>
                          <FileText size={15} color={palette.primaryStrong} />
                          <Text style={styles.resourceTitle}>Ressource {index + 1}</Text>
                        </View>
                        <Pressable disabled={resources.length <= 1} onPress={() => removeResource(index)} style={StyleSheet.flatten([styles.iconButton, resources.length <= 1 && styles.disabled])}>
                          <Trash2 size={16} color={palette.inkSecondary} />
                        </Pressable>
                      </View>
                      <TextInput value={resource.title} onChangeText={(value) => updateResource(index, { title: value })} placeholder="Titre de la ressource" placeholderTextColor={authField.placeholderColor} style={styles.input} />
                      <TextInput value={resource.url} onChangeText={(value) => updateResource(index, { url: value })} placeholder="https://..." placeholderTextColor={authField.placeholderColor} autoCapitalize="none" keyboardType="url" style={styles.input} />
                      <View style={styles.segmentRow}>
                        {RESOURCE_TYPES.map((item) => {
                          const active = resource.resource_type === item.value;
                          return (
                            <Pressable key={item.value} onPress={() => updateResource(index, { resource_type: item.value })} style={StyleSheet.flatten([styles.segment, active && styles.segmentActive])}>
                              <Text style={StyleSheet.flatten([styles.segmentText, active && styles.segmentTextActive])}>{item.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <TextInput value={resource.description ?? ""} onChangeText={(value) => updateResource(index, { description: value })} multiline placeholder="Description courte optionnelle" placeholderTextColor={authField.placeholderColor} style={StyleSheet.flatten([styles.input, styles.resourceDescription])} />
                    </View>
                  ))}
                  <Pressable disabled={resources.length >= 5} onPress={() => setResources((current) => [...current, createEmptyResource()])} style={StyleSheet.flatten([styles.addChoice, resources.length >= 5 && styles.disabled])}>
                    <Plus size={16} color={palette.primaryStrong} />
                    <Text style={styles.addChoiceText}>Ajouter une ressource</Text>
                  </Pressable>
                  <Text style={styles.cardText}>URLs externes uniquement, en http ou https. Maximum 5 ressources.</Text>
                </View>
              </Field>
            ) : null}

            <Field label="Choix de reponses">
              <View style={styles.choiceList}>
                {choices.map((choice, index) => (
                  <View key={index} style={styles.choiceRow}>
                    <TextInput value={choice} onChangeText={(value) => updateChoice(index, value)} placeholder={`Choix ${index + 1}`} placeholderTextColor={authField.placeholderColor} style={StyleSheet.flatten([styles.input, styles.choiceInput])} />
                    <Pressable disabled={choices.length <= 2 || editingVotes > 0} onPress={() => removeChoice(index)} style={StyleSheet.flatten([styles.iconButton, (choices.length <= 2 || editingVotes > 0) && styles.disabled])}>
                      <Trash2 size={16} color={palette.inkSecondary} />
                    </Pressable>
                  </View>
                ))}
                <Pressable disabled={choices.length >= 6 || editingVotes > 0} onPress={() => setChoices((current) => [...current, ""])} style={StyleSheet.flatten([styles.addChoice, (choices.length >= 6 || editingVotes > 0) && styles.disabled])}>
                  <Plus size={16} color={palette.primaryStrong} />
                  <Text style={styles.addChoiceText}>Ajouter un choix</Text>
                </Pressable>
              </View>
            </Field>

            <View style={styles.twoColumns}>
              <Field label="Statut" style={styles.columnField}>
                <View style={styles.segmentRow}>
                  <Pressable onPress={() => setStatus("open")} style={StyleSheet.flatten([styles.segment, status === "open" && styles.segmentActive])}>
                    <Text style={StyleSheet.flatten([styles.segmentText, status === "open" && styles.segmentTextActive])}>Ouvert</Text>
                  </Pressable>
                  <Pressable onPress={() => setStatus("closed")} style={StyleSheet.flatten([styles.segment, status === "closed" && styles.segmentActive])}>
                    <Text style={StyleSheet.flatten([styles.segmentText, status === "closed" && styles.segmentTextActive])}>Cloture</Text>
                  </Pressable>
                </View>
              </Field>

              <Field label="Duree" style={styles.columnField}>
                <View style={styles.segmentRow}>
                  {DURATION_OPTIONS.map((item) => {
                    const active = duration === item.value;
                    return (
                      <Pressable key={item.value} onPress={() => setDuration(item.value)} style={StyleSheet.flatten([styles.segment, active && styles.segmentActive])}>
                        <Text style={StyleSheet.flatten([styles.segmentText, active && styles.segmentTextActive])}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {duration === "custom" ? <TextInput value={customDays} onChangeText={setCustomDays} keyboardType="number-pad" placeholder="Nombre de jours" placeholderTextColor={authField.placeholderColor} style={styles.input} /> : null}
              </Field>
            </View>

            <View style={styles.checkboxGrid}>
              <Checkbox label="Mettre en avant" value={featured} onToggle={() => setFeatured((value) => !value)} />
              <Checkbox label="Visible dans Derniers resultats" value={showInResults} disabled={status !== "closed"} onToggle={() => setShowInResults((value) => !value)} />
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            {createdPollId ? (
              <View style={styles.success}>
                <Text style={styles.successTitle}>Sondage cree</Text>
                <Text selectable style={styles.successText}>{createdPollId}</Text>
                <Pressable onPress={() => createdPublicPath && router.push(createdPublicPath as Href)} style={styles.secondaryAction}>
                  <Text style={styles.secondaryActionText}>Voir le sondage</Text>
                  <ArrowRight size={15} color={palette.primaryStrong} />
                </Pressable>
              </View>
            ) : null}

            <Pressable disabled={submitting} onPress={submit} style={StyleSheet.flatten([styles.submit, submitting && styles.disabled])}>
              {submitting ? <ActivityIndicator color={palette.onPrimary} /> : <Text style={styles.submitText}>{editingPollId ? "Mettre a jour" : "Creer le sondage"}</Text>}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </PageShell>
  );
}

function PollList({
  polls,
  emptyLabel,
  relaunchDays,
  setRelaunchDays,
  onView,
  onEdit,
  onClose,
  onRelaunch,
  onVisibility,
  onArchive
}: {
  polls: AdminPollSummary[];
  emptyLabel: string;
  relaunchDays: string;
  setRelaunchDays: (value: string) => void;
  onView: (poll: AdminPollSummary) => void;
  onEdit: (poll: AdminPollSummary) => void;
  onClose: (pollId: string) => void;
  onRelaunch: (pollId: string) => void;
  onVisibility: (pollId: string, visible: boolean) => void;
  onArchive: (pollId: string) => void;
}) {
  if (polls.length === 0) return <Text style={styles.emptyText}>{emptyLabel}</Text>;
  return (
    <View style={styles.list}>
      <View style={styles.relaunchBar}>
        <Text style={styles.label}>Duree des relances rapides</Text>
        <TextInput value={relaunchDays} onChangeText={setRelaunchDays} keyboardType="number-pad" placeholder="7" placeholderTextColor={authField.placeholderColor} style={StyleSheet.flatten([styles.input, styles.daysInput])} />
        <Text style={styles.cardText}>jours. Une relance cree toujours un nouveau poll_id.</Text>
      </View>
      {polls.map((poll) => (
        <View key={poll.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.meta}>{getThemeLabel(poll.theme)} - vague #{poll.wave_number ?? 1} - {poll.status}{poll.archived ? " - archive" : ""}</Text>
              <Text style={styles.cardTitle}>{poll.question}</Text>
              <Text style={styles.cardText}>Cloture : {formatDate(poll.closes_at)} - {poll.total_votes} votes - {poll.choice_count} choix</Text>
              <Text style={styles.cardText}>Serie : {poll.series_id ?? "non rattachee"} - Resultats publics : {poll.show_in_results ? "oui" : "non"}</Text>
            </View>
            <View style={styles.badges}>
              {poll.featured ? <Text style={styles.badge}>Mis en avant</Text> : null}
              {poll.show_in_results ? <Text style={styles.badge}>Resultats visibles</Text> : null}
            </View>
          </View>
          <View style={styles.actions}>
            <IconAction icon={<Eye size={15} color={palette.primaryStrong} />} label="Voir" onPress={() => onView(poll)} />
            <IconAction icon={<Pencil size={15} color={palette.primaryStrong} />} label="Modifier" onPress={() => onEdit(poll)} />
            {poll.status === "open" ? <IconAction icon={<Square size={15} color={palette.primaryStrong} />} label="Cloturer" onPress={() => onClose(poll.id)} /> : null}
            {poll.status === "closed" && !poll.archived ? (
              <IconAction
                icon={poll.show_in_results ? <EyeOff size={15} color={palette.primaryStrong} /> : <CheckCircle2 size={15} color={palette.primaryStrong} />}
                label={poll.show_in_results ? "Retirer resultats" : "Publier resultats"}
                onPress={() => onVisibility(poll.id, !poll.show_in_results)}
              />
            ) : null}
            <IconAction icon={<RefreshCw size={15} color={palette.primaryStrong} />} label="Relancer" onPress={() => onRelaunch(poll.id)} />
            <IconAction icon={<Archive size={15} color={palette.primaryStrong} />} label="Archiver/supprimer" onPress={() => onArchive(poll.id)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: ComponentProps<typeof View>["style"] }) {
  return (
    <View style={StyleSheet.flatten([styles.field, style])}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={StyleSheet.flatten([styles.tab, active && styles.tabActive])}>
      <Text style={StyleSheet.flatten([styles.tabText, active && styles.tabTextActive])}>{label}</Text>
    </Pressable>
  );
}

function IconAction({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryAction}>
      {icon}
      <Text style={styles.secondaryActionText}>{label}</Text>
    </Pressable>
  );
}

function Checkbox({ label, value, disabled, onToggle }: { label: string; value: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onToggle} style={StyleSheet.flatten([styles.checkboxRow, disabled && styles.disabled])}>
      <View style={StyleSheet.flatten([styles.checkbox, value && styles.checkboxActive])}>{value ? <Text style={styles.checkboxMark}>v</Text> : null}</View>
      <Text style={styles.checkboxText}>{label}</Text>
    </Pressable>
  );
}

function createEmptyResource(): PollResourceInput {
  return { title: "", url: "", resource_type: "link", description: "" };
}

function normalizeResources(resources: PollResourceInput[]) {
  return resources
    .map((resource) => ({
      title: resource.title.trim(),
      url: resource.url.trim(),
      resource_type: resource.resource_type,
      description: resource.description?.trim() || null
    }))
    .filter((resource) => resource.title || resource.url || resource.description);
}

function validateResources(resources: PollResourceInput[]) {
  const normalized = normalizeResources(resources);
  if (normalized.length === 0) return "Ajoutez au moins une ressource ou desactivez l'option.";
  if (normalized.length > 5) return "Limitez les ressources a cinq liens maximum.";
  for (const resource of normalized) {
    if (!resource.title) return "Chaque ressource doit avoir un titre.";
    if (!resource.url) return "Chaque ressource doit avoir une URL.";
    if (!isSafeHttpUrl(resource.url)) return "Les ressources doivent utiliser une URL http ou https valide.";
    if (!RESOURCE_TYPES.some((item) => item.value === resource.resource_type)) return "Type de ressource invalide.";
    if (resource.title.length > 140) return "Limitez le titre des ressources a 140 caracteres.";
    if ((resource.description ?? "").length > 280) return "Limitez la description des ressources a 280 caracteres.";
  }
  return null;
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildSeries(polls: AdminPollSummary[]): AdminSeriesSummary[] {
  const groups = new Map<string, AdminPollSummary[]>();
  for (const poll of polls) {
    if (!poll.series_id) continue;
    groups.set(poll.series_id, [...(groups.get(poll.series_id) ?? []), poll]);
  }
  return [...groups.entries()]
    .map(([seriesId, items]) => {
      const sorted = [...items].sort((a, b) => Number(b.wave_number ?? 1) - Number(a.wave_number ?? 1));
      const lastWave = sorted[0];
      return {
        series_id: seriesId,
        slug: lastWave.series_slug ?? "",
        question: lastWave.question,
        theme: lastWave.theme,
        waveCount: sorted.length,
        lastWave,
        polls: sorted
      };
    })
    .sort((a, b) => String(b.lastWave.created_at).localeCompare(String(a.lastWave.created_at)));
}

function getAdminPollHref(poll: AdminPollSummary) {
  if (!poll.series_slug || poll.wave_number === null) return `/poll/${poll.id}`;
  return getPollPublicPath({
    series_slug: poll.series_slug,
    wave_number: poll.wave_number,
    status: poll.status,
    closes_at: poll.closes_at,
    show_in_results: poll.show_in_results,
    archived: poll.archived
  }) ?? `/poll/${poll.id}`;
}

function deriveChoiceKeys(labels: string[]) {
  return labels.map((label, index) => {
    const normalized = label.trim().toLowerCase();
    if (normalized === "oui" || normalized === "yes") return "yes";
    if (normalized === "non" || normalized === "no") return "no";
    if (normalized === "ne se prononce pas" || normalized === "sans opinion") return "no_opinion";
    return `choice_${index + 1}`;
  });
}

function formatDate(value: string | null) {
  if (!value) return "non definie";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const webInputReset = Platform.OS === "web"
  ? ({ outlineStyle: "none" } as unknown as ComponentProps<typeof TextInput>["style"])
  : null;

const styles = StyleSheet.create({
  page: { gap: 18, paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 },
  headerCopy: { gap: 8, maxWidth: 760 },
  kicker: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.1 },
  title: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 36, lineHeight: 42 },
  subtitle: { color: palette.muted, fontSize: 15, lineHeight: 23 },
  sectionTitle: { color: palette.ink, fontFamily: fontFamilyBold, fontSize: 22, lineHeight: 28 },
  notice: { maxWidth: 560, alignSelf: "center", borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 24, gap: 14, alignItems: "flex-start" },
  noticeText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 14, lineHeight: 22 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { minHeight: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  tabActive: { borderColor: palette.primaryStrong, backgroundColor: palette.primarySoft },
  tabText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  tabTextActive: { color: palette.ink, fontFamily: fontFamilySemibold },
  loadingLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  form: { borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 18, gap: 18 },
  formHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  field: { gap: 7 },
  label: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  input: {
    minHeight: 46,
    borderRadius: authField.borderRadius,
    borderWidth: authField.borderWidth,
    borderColor: "transparent",
    backgroundColor: authField.background,
    color: palette.ink,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: fontFamilyMedium,
    fontSize: 14,
    ...(webInputReset as object)
  },
  textarea: { minHeight: 112, textAlignVertical: "top", lineHeight: 21 },
  choiceList: { gap: 9 },
  choiceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  choiceInput: { flex: 1 },
  iconButton: { width: 42, minHeight: 42, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.lineStrong },
  addChoice: { alignSelf: "flex-start", minHeight: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  addChoiceText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 13 },
  resourceList: { gap: 10 },
  resourceCard: { borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surfaceSubtle, padding: 12, gap: 10 },
  resourceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  resourceTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  resourceTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 14 },
  resourceDescription: { minHeight: 76, textAlignVertical: "top", lineHeight: 20 },
  twoColumns: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  columnField: { flex: 1, minWidth: 260 },
  segmentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segment: { minHeight: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  segmentActive: { borderColor: palette.primaryStrong, backgroundColor: palette.primarySoft },
  segmentText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 13 },
  segmentTextActive: { color: palette.ink, fontFamily: fontFamilySemibold },
  checkboxGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start" },
  checkbox: { width: 20, height: 20, borderRadius: radius.xs, borderWidth: 1, borderColor: palette.lineStrong, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  checkboxMark: { color: palette.onPrimary, fontFamily: fontFamilyBold, fontSize: 13, lineHeight: 16 },
  checkboxText: { color: palette.inkSecondary, fontFamily: fontFamilyMedium, fontSize: 13 },
  list: { gap: 12 },
  relaunchBar: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surfaceSubtle, padding: 12 },
  daysInput: { width: 76, minHeight: 38, paddingVertical: 8 },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, padding: 16, gap: 14 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  cardTitleBlock: { flex: 1, minWidth: 260, gap: 6 },
  meta: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.9 },
  cardTitle: { color: palette.ink, fontFamily: fontFamilySemibold, fontSize: 17, lineHeight: 24 },
  cardText: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  badge: { color: palette.inkSecondary, borderWidth: 1, borderColor: palette.lineStrong, borderRadius: radius.xs, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontFamily: fontFamilyMedium },
  waveList: { gap: 5, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 10 },
  waveLine: { color: palette.muted, fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryAction: { minHeight: 42, borderRadius: radius.sm, backgroundColor: palette.primary, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryActionText: { color: palette.onPrimary, fontFamily: fontFamilySemibold },
  secondaryAction: { minHeight: 36, borderRadius: radius.sm, borderWidth: 1, borderColor: palette.lineStrong, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7 },
  secondaryActionText: { color: palette.primaryStrong, fontFamily: fontFamilySemibold, fontSize: 12 },
  submit: { minHeight: 48, borderRadius: radius.sm, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  submitText: { color: palette.onPrimary, fontFamily: fontFamilySemibold, fontSize: 14 },
  error: { color: palette.dangerText, backgroundColor: palette.dangerSoft, borderRadius: radius.sm, padding: 12, fontFamily: fontFamilyMedium, fontSize: 13 },
  successMessage: { color: palette.positiveText, backgroundColor: palette.positiveSoft, borderRadius: radius.sm, padding: 12, fontFamily: fontFamilyMedium, fontSize: 13 },
  success: { borderRadius: radius.sm, borderWidth: 1, borderColor: palette.positiveLine, backgroundColor: palette.positiveSoft, padding: 14, gap: 8, alignItems: "flex-start" },
  successTitle: { color: palette.positiveText, fontFamily: fontFamilySemibold, fontSize: 14 },
  successText: { color: palette.inkSecondary, fontSize: 12 },
  emptyText: { color: palette.muted, fontFamily: fontFamilyMedium, fontSize: 14 },
  disabled: { opacity: 0.48 }
});
