<script setup lang="ts">
import { computed, inject, onMounted, ref, type Ref } from 'vue';
import { LEGAL_FORMS, isCompanyLegalForm, type Imprint } from '@hxroom/shared';
import { LegalOperatorImprint } from '@hxroom/ui';
import { COACH_KEY, type CoachProfile } from '../composables/useCoach';
import { apiUrl, orgSlug } from '../utils/api';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import LoadingState from '../components/LoadingState.vue';

// Impressum der Buchungsseite (doc/legal.md §3.2): oben der Coach als Anbieter dieser Seite,
// darunter HxRoom als technischer Betreiber – derselbe Block wie auf hxroom.de/impressum.
// Stile aus @hxroom/ui/theme (legal.css).

interface ImprintResponse {
  mode: 'form' | 'link' | null;
  imprint: Imprint | null;
  url: string | null;
}

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY);
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach');

const data = ref<ImprintResponse | null>(null);
const failed = ref(false);

onMounted(async () => {
  try {
    const res = await fetch(`${apiUrl}/api/v1/organizations/${orgSlug()}/imprint`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.value = await res.json();
  } catch {
    failed.value = true;
  }
});

const imprint = computed(() => (data.value?.mode === 'form' ? data.value.imprint : null));
const legalFormLabel = computed(() => (imprint.value?.legalForm ? LEGAL_FORMS[imprint.value.legalForm] : null));
const showRepresentative = computed(() => isCompanyLegalForm(imprint.value?.legalForm) && !!imprint.value?.representative);
</script>

<template>
  <SiteHeader />

  <section class="max-w-[760px] mx-auto px-6 pt-16 pb-20">
    <div class="legal-container">
      <span class="legal-eyebrow">Rechtliches</span>
      <h1 class="legal-headline">Impressum</h1>
      <p class="legal-sub">Angaben gemäß § 5 DDG für diese Buchungsseite.</p>

      <LoadingState v-if="!data && !failed" />

      <template v-else>
        <section class="legal-section">
          <div class="legal-section-label">Anbieter dieser Seite</div>

          <div v-if="imprint" class="legal-card">
            <p class="legal-address">
              <strong>{{ imprint.name }}</strong><br>
              {{ imprint.street }}<br>
              {{ imprint.postalCode }} {{ imprint.city }}<br>
              {{ imprint.country }}
            </p>
          </div>

          <div v-else-if="data?.mode === 'link' && data.url" class="legal-card">
            <p>
              Das Impressum von {{ coachName }} findest du hier:<br>
              <a :href="data.url" target="_blank" rel="noopener noreferrer">{{ data.url }}</a>
            </p>
          </div>

          <div v-else class="legal-card">
            <p class="muted">
              {{ failed ? 'Das Impressum lässt sich gerade nicht laden. Bitte versuche es später noch einmal.' : 'Für diese Buchungsseite ist noch kein Impressum hinterlegt.' }}
            </p>
          </div>
        </section>

        <section v-if="imprint" class="legal-section">
          <div class="legal-section-label">Kontakt</div>
          <div class="legal-card">
            <div class="legal-meta-grid">
              <div class="legal-meta-item">
                <div class="lbl">E-Mail</div>
                <div class="val"><a :href="`mailto:${imprint.email}`">{{ imprint.email }}</a></div>
              </div>
              <div class="legal-meta-item">
                <div class="lbl">Telefon</div>
                <div class="val"><a :href="`tel:${imprint.phone.replace(/[^+0-9]/g, '')}`">{{ imprint.phone }}</a></div>
              </div>
              <div v-if="legalFormLabel" class="legal-meta-item">
                <div class="lbl">Rechtsform</div>
                <div class="val">{{ legalFormLabel }}</div>
              </div>
              <div v-if="showRepresentative" class="legal-meta-item">
                <div class="lbl">Vertretungsberechtigt</div>
                <div class="val">{{ imprint.representative }}</div>
              </div>
              <div v-if="imprint.register" class="legal-meta-item">
                <div class="lbl">Registereintrag</div>
                <div class="val">{{ imprint.register }}</div>
              </div>
              <div v-if="imprint.vatId" class="legal-meta-item">
                <div class="lbl">USt-IdNr.</div>
                <div class="val">{{ imprint.vatId }}</div>
              </div>
            </div>
            <p v-if="imprint.addition" class="muted mt-5 whitespace-pre-line">{{ imprint.addition }}</p>
          </div>
        </section>

        <LegalOperatorImprint variant="operator" />
      </template>
    </div>
  </section>

  <SiteFooter />
</template>
