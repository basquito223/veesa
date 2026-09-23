import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { getBilateralRule } from './src/data/bilateralAgreements';

function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  if (status === 429 || status === 503 || status === 'RESOURCE_EXHAUSTED') return true;
  const str = String(err.message || '') + ' ' + String(typeof err === 'object' ? JSON.stringify(err) : err);
  return (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('quota') ||
    str.includes('rate-limit') ||
    str.includes('rate limit') ||
    str.includes('overloaded') ||
    str.includes('503') ||
    str.includes('UNAVAILABLE')
  );
}

function generateFallbackBilateralAnalysis(originCountry: string, destination: string): string {
  const rule = getBilateralRule(originCountry, destination as any);
  return `### RAPPORT CONSULAIRE OFFICIEL 2026 (${rule.verificationSource})
Demandeur : Citoyen de ${originCountry} (Passeport ordinaire) | Destination : ${rule.destinationLabel}

1. DISPENSE OU OBLIGATION DE VISA :
• Statut juridique vérifié : ${rule.badgeLabel}
• Conclusion consulaire : ${rule.headline}

2. FONDEMENT JURIDIQUE & TRAITÉS BILATÉRAUX :
• ${rule.legalBasis}
• Durée maximale autorisée : jusqu'à ${rule.stayLimitDays} jours sans titre de séjour.

3. COÛT OFFICIEL ET FRAIS LÉGAUX :
• Tarification réglementaire : ${rule.officialCostDisplay}
• Avertissement : Les dispenses officielles sont gratuites (0 FCFA). Aucun paiement préalable n'est requis par l'autorité régalienne.

4. DOCUMENTS EXIGÉS AU POSTE FRONTIÈRE (PAF) :
${rule.entryDocuments.map((doc) => `• ${doc}`).join('\n')}

5. VIGILANCE ANTI-ARNAQUE & CANAUX OFFICIELS :
• ${rule.antiScamAlert}
• Référence officielle : ${rule.officialPortalName} (${rule.officialPortalUrl || 'Contrôle direct aux frontières'})`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // API health check route for Cloud Run container monitoring
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // AI Consulaire: Unique Anti-Plagiat Letter Generator
  app.post('/api/generate-letter', async (req, res) => {
    try {
      const {
        letterType = 'motivation',
        visaReason = 'etudes',
        destination = 'france_etudes',
        destinationName = 'France / Schengen',
        countryOfOrigin = 'Sénégal',
        applicantName = 'M./Mme [Nom du Demandeur]',
        passportNumber = 'P00000000',
        status = 'etudiant',
        jobOrDegreeDetails = '',
        fundingSource = 'garant_local',
        guarantorName = 'M./Mme [Garant]',
        guarantorRelation = 'Parent direct',
        budgetFcfa = 7500000,
        tiesType = 'etudes_en_cours',
        travelDurationDays = 15,
        tone = 'academique',
        customNotes = '',
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          success: false,
          fallbackReason: 'NO_API_KEY',
          message: 'Clé GEMINI_API_KEY non configurée sur le serveur. Utilisation du générateur certifié local.',
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Build targeted consular prompt based on letterType and user profile
      let toneDescription = 'académique, rigoureux et hautement argumenté';
      if (tone === 'diplomatique') {
        toneDescription = 'solennel, respectueux des traités bilatéraux et du code consulaire';
      } else if (tone === 'professionnel') {
        toneDescription = 'direct, synthétique, pragmatique avec chiffres et jalons clairs';
      }

      let taskPrompt = '';
      if (letterType === 'motivation') {
        taskPrompt = `Rédige une LETTRE DE MOTIVATION CONSULAIRE UNIQUE ET NON-GÉNÉRIQUE pour une demande de visa.
- Motif déclaré : ${visaReason}
- Destination : ${destinationName} (Régime ${destination})
- Demandeur : ${applicantName}, titulaire du passeport ${passportNumber} résidant en ${countryOfOrigin}
- Statut actuel : ${status} (${jobOrDegreeDetails || 'Parcours régulier'})
- Durée prévue : ${travelDurationDays} jours ou cursus complet
- Mode de financement : ${fundingSource} (Budget/Solde disponible déclaré : ${Number(budgetFcfa).toLocaleString('fr-FR')} FCFA)
- Garant : ${guarantorName} (Lien : ${guarantorRelation})
- Attaches au pays d'origine : ${tiesType}
- Précisions personnalisées de l'utilisateur : ${customNotes || 'Aucune note additionnelle'}`;
      } else if (letterType === 'garant') {
        taskPrompt = `Rédige une ATTESTATION D'ENGAGEMENT DE PRISE EN CHARGE FINANCIÈRE ET D'HÉBERGEMENT DU GARANT pour le service des visas (${destinationName}).
- Garant déclarant : ${guarantorName} (Lien de parenté : ${guarantorRelation})
- Demandeur soutenu : ${applicantName}, résidant en ${countryOfOrigin}, passeport ${passportNumber}
- Motif du séjour : ${visaReason} vers ${destinationName}
- Montant / Capacité financière mobilisée : ${Number(budgetFcfa).toLocaleString('fr-FR')} FCFA
- Précisions de l'utilisateur : ${customNotes || 'Prise en charge complète des frais de subsistance, de scolarité/hébergement et d’assurance rapatriement.'}`;
      } else {
        taskPrompt = `Rédige une NOTE EXPLICATIVE DE JUSTIFICATION DES ATTACHES AU PAYS D'ORIGINE (${countryOfOrigin}) pour écarter formellement tout risque de refus pour soupçon d'émigration irrégulière (ex: Motif R216 IRCC ou Motif 2/10 Schengen).
- Demandeur : ${applicantName}, passeport ${passportNumber}, citoyen de ${countryOfOrigin}
- Statut & Attaches déclarées : ${status}, ${tiesType} (${jobOrDegreeDetails})
- Précisions de l'utilisateur : ${customNotes || 'Famille, emploi pérenne ou obligations universitaires/patrimoniales exigeant un retour immédiat.'}`;
      }

      const systemInstruction = `Tu es un avocat expert en droit de l'immigration consulaire (Espace Schengen France-Visas, Canada IRCC, Maroc Acces-Maroc, etc.).
Ton rôle est de rédiger un document officiel français d'une perfection absolue, 100% personnalisé, crédible et persuasif.
RÈGLES CAPITALES ANTI-PLAGIAT ET ANTI-REJET CONSULAIRE :
1. Bannis formellement les modèles types stéréotypés d'Internet que les agents consulaires ont lus mille fois et qu'ils rejettent systématiquement pour manque d'authenticité.
2. Ancre précisément le texte dans la réalité économique du pays d'origine (${countryOfOrigin}) : cite les secteurs en essor, la cohérence du projet et les obligations matérielles locales.
3. Rédige avec un ton ${toneDescription}.
4. Mets en avant la transparence financière absolue, l'absence d'artifice bancaire et l'engagement indéfectible de retour au pays à l'issue de l'objet du visa.
5. Inclus l'en-tête officiel classique (Coordonnées du demandeur/garant, date actuelle, destinataire consulaire officiel, objet détaillé), des sections argumentées claires et la formule de politesse finale avec espace de signature manuscrite.
6. Ne génère QUE le texte de la lettre officielle, directement exploitable et imprimable, sans commentaires superflus avant ou après.
7. RESPECT STRICT DE LA DESTINATION RÉELLE (${destinationName}) :
- Si la destination est le Canada : adresse impérativement la lettre à la Section des Visas et de l'Immigration – IRCC (Ambassade / Haut-Commissariat du Canada). Ne cite JAMAIS la France, l'Espace Schengen, Campus France, les Euros ou le Code des Visas lorsque la destination est le Canada.
- Si la destination est le Maroc : Si le demandeur est de Côte d'Ivoire, il s'agit d'un e-Visa payant sur le portail acces-maroc.ma (frais ~770 MAD / 52 000 FCFA, durée 30 jours max). Si le demandeur est du Mali, Sénégal ou autre pays exempté, il s'agit d'une entrée sans visa (0 FCFA, 90 jours max, sans AEVM) dispensée de visa en vertu de la convention bilatérale. Ne cite JAMAIS le Code des Visas Schengen, Campus France ou une assurance de 30 000 € lorsque la destination est le Maroc.
8. INTERDICTION FORMELLE DE NUMÉRO DE DOSSIER INTERNE OU RÉFÉRENCE SYSTÈME : N'inclus AUCUN numéro de dossier, référence interne, code applicatif ou mention du type "Réf. Dossier : VF-...", "Ref:", "Dossier N°" ou code de suivi. Cette lettre est un document officiel directement rédigé et soumis par le demandeur aux autorités consulaires, elle ne doit porter aucune référence d'un logiciel ou service tiers.`;

      let generatedLetter = '';
      let modelUsed = 'gemini-3.8-flash';

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: taskPrompt,
          config: {
            systemInstruction,
            temperature: 0.75,
          },
        });
        generatedLetter = response.text?.trim() || '';
      } catch (firstErr: any) {
        if (isQuotaOrRateLimitError(firstErr)) {
          console.warn('[Gemini Quota Notice] Primary model rate limited in letter generation, retrying with gemini-3.1-flash-lite...');
          const retryResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: taskPrompt,
            config: {
              systemInstruction,
              temperature: 0.75,
            },
          });
          generatedLetter = retryResponse.text?.trim() || '';
          modelUsed = 'gemini-3.1-flash-lite';
        } else {
          throw firstErr;
        }
      }

      if (!generatedLetter) {
        throw new Error('Réponse vide du modèle Gemini.');
      }

      // Ensure no internal file number or system reference slipped through
      generatedLetter = generatedLetter
        .split('\n')
        .filter((line) => !/^\s*(R[ée]f[.\s]|Dossier\s+R[ée]f|R[ée]f[ée]rence\s+Dossier|Dossier\s+N[°o]|VF-[A-Z0-9]+)/i.test(line))
        .join('\n');

      return res.json({
        success: true,
        generatedWithAI: true,
        content: generatedLetter,
        modelUsed,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn('[AI Consular Generation Notice]:', error?.message || 'Quota ou indisponibilité temporaire');
      return res.status(200).json({
        success: false,
        error: error.message || 'Erreur temporaire lors de la génération IA',
        fallbackReason: isQuotaOrRateLimitError(error) ? 'QUOTA_EXCEEDED' : 'AI_ERROR',
      });
    }
  });

  // Real-Time Bilateral Consular Fact-Checking with Google Search Grounding and Certified Treaty Fallback
  app.post('/api/check-bilateral-live', async (req, res) => {
    const { originCountry = 'Mali', destination = 'maroc' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallbackText = generateFallbackBilateralAnalysis(originCountry, destination);
      const rule = getBilateralRule(originCountry, destination as any);
      return res.status(200).json({
        success: true,
        useLocalFallback: true,
        isFallback: true,
        liveAnalysis: fallbackText,
        quotaNotice: 'Données certifiées de la base consulaire 2026 (Mode hors-ligne)',
        groundingSources: rule.officialPortalUrl ? [{ web: { uri: rule.officialPortalUrl, title: rule.officialPortalName } }] : [],
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Agis en tant qu'auditeur juridique consulaire international.
Effectue une vérification en direct et à jour des règles d'entrée, accords bilatéraux et formalités consulaires pour :
- Citoyen de : ${originCountry} (titulaire d'un passeport ordinaire)
- Pays de destination : ${destination}

Interroge les sources gouvernementales les plus récentes (diplomatie.ma, france-visas.gouv.fr, canada.ca, ministères des affaires étrangères) et fournis une réponse factuelle structurée :
1. DISPENSE OU OBLIGATION DE VISA : Indique formellement si l'entrée est SANS VISA (exemption totale), sous E-VISA, sous AEVM ou sous VISA CONSULAIRE CLASSIQUE.
2. TEXTES ET ACCORDS BILATÉRAUX : Cite l'accord ou la disposition légale spécifique. Si une mesure a été levée (comme l'AEVM pour les Maliens au Maroc), précise-le sans équivoque.
3. COÛT OFFICIEL ET FRAIS LÉGAUX : Montant exact (0 FCFA si dispense totale).
4. DOCUMENTS EXIGÉS AU POSTE FRONTIÈRE (PAF) : Passeport, billet retour, justificatif d'hébergement, etc.
5. VIGILANCE ANTI-ARNAQUE : Alertes contre les intermédiaires véreux ou faux sites.`;

      let text = '';
      let groundingMetadata: any = null;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.2,
          },
        });
        text = response.text || '';
        groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      } catch (searchErr: any) {
        if (isQuotaOrRateLimitError(searchErr)) {
          console.warn('[Gemini Quota Notice] Search tool or model rate-limited. Retrying with gemini-3.1-flash-lite...');
          const liteResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              temperature: 0.2,
            },
          });
          text = liteResponse.text || '';
        } else {
          throw searchErr;
        }
      }

      if (!text) {
        throw new Error('Réponse vide du service');
      }

      return res.json({
        success: true,
        liveAnalysis: text,
        groundingSources: groundingMetadata?.groundingChunks || [],
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('[Bilateral Live Check Fallback Activated]:', err?.message || 'Quota temporairement atteint');
      const fallbackText = generateFallbackBilateralAnalysis(originCountry, destination);
      const rule = getBilateralRule(originCountry, destination as any);

      return res.status(200).json({
        success: true,
        useLocalFallback: true,
        isFallback: true,
        liveAnalysis: fallbackText,
        quotaNotice: 'Référentiel consulaire officiel 2026 (Quota API temporairement atteint)',
        groundingSources: rule.officialPortalUrl
          ? [{ web: { uri: rule.officialPortalUrl, title: rule.officialPortalName } }]
          : [],
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
