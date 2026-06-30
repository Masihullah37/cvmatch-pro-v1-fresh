export default function PrivacyPage() {

  const COMPANY_NAME = "YOUR_COMPANY_NAME";
  const LEGAL_FORM = "Micro-entrepreneur";
  const COMPANY_ADDRESS = "YOUR_COMPANY_ADDRESS";
  const SIREN = "YOUR_SIREN";
  const SIRET = "YOUR_SIRET";
  const VAT_NUMBER = "TVA non applicable – article 293 B du Code général des impôts";
  const DIRECTOR_NAME = "YOUR_NAME";
  const WEBSITE_URL = "https://ouicv.fr";

  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-700 leading-relaxed">

      <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">
        Politique de Confidentialité
      </h1>

      <p className="text-sm text-slate-500 mb-12 italic">
        Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
      </p>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          1. Préambule
        </h2>

        <p>
          La présente Politique de Confidentialité explique comment
          <strong> {WEBSITE_URL} </strong>
          collecte, utilise, protège, conserve et supprime vos données
          personnelles lorsque vous utilisez notre plateforme de création,
          d'optimisation et d'analyse de CV assistée par intelligence
          artificielle.
        </p>

        <p>
          Nous accordons une importance particulière à la protection de vos
          données personnelles et nous nous engageons à respecter le
          Règlement (UE) 2016/679 du Parlement européen et du Conseil du
          27 avril 2016 (« RGPD »), la Loi Informatique et Libertés
          modifiée ainsi que les recommandations publiées par la CNIL.
        </p>

        <p>
          En utilisant {WEBSITE_URL} , vous acceptez les traitements décrits dans la
          présente politique lorsque ceux-ci reposent sur une base juridique
          valable au sens de l'article 6 du RGPD.
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          2. Responsable du traitement
        </h2>

        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 space-y-2">

          <p>
            <strong>Société :</strong> {COMPANY_NAME}
          </p>

          <p>
            <strong>Adresse :</strong> {COMPANY_ADDRESS}
          </p>

          <p>
            <strong>SIREN :</strong> {SIREN}
          </p>

          <p>
            <strong>SIRET :</strong> {SIRET}
          </p>

          <p>
            <strong>Email :</strong> contact@ouicv.fr
          </p>

        </div>

        <p>
          Le Responsable du traitement détermine les finalités et les moyens
          des traitements de données personnelles réalisés sur la plateforme.
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          3. Définitions
        </h2>

        <p>
          Pour faciliter la lecture de cette politique, les termes suivants
          sont utilisés :
        </p>

        <ul className="list-disc pl-6 space-y-3">

          <li>
            <strong>Donnée personnelle :</strong> toute information se
            rapportant à une personne physique identifiée ou identifiable.
          </li>

          <li>
            <strong>Traitement :</strong> toute opération réalisée sur des
            données personnelles (collecte, stockage, consultation,
            modification, suppression, etc.).
          </li>

          <li>
            <strong>Utilisateur :</strong> toute personne utilisant OuiCV.
          </li>

          <li>
            <strong>Compte :</strong> espace personnel créé par
            l'utilisateur.
          </li>

        </ul>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          4. Données personnelles collectées
        </h2>

        <p>
          Nous collectons uniquement les données strictement nécessaires au
          fonctionnement de la plateforme.
        </p>

        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">

          <ul className="list-disc pl-6 space-y-3">

            <li>
              Nom et prénom (si renseignés).
            </li>

            <li>
              Adresse électronique.
            </li>

            <li>
              Identifiant utilisateur fourni par Clerk.
            </li>

            <li>
              Photo de profil (si l'utilisateur en ajoute une).
            </li>

            <li>
              CV importés (PDF ou DOCX).
            </li>

            <li>
              Texte du CV extrait.
            </li>

            <li>
              Descriptions de poste renseignées.
            </li>

            <li>
              Informations de profil saisies manuellement.
            </li>

            <li>
              Historique des analyses.
            </li>

            <li>
              Nombre de crédits disponibles.
            </li>

            <li>
              Historique des paiements.
            </li>

            <li>
              Préférences utilisateur.
            </li>

            <li>
              Adresse IP.
            </li>

            <li>
              Informations techniques du navigateur.
            </li>

            <li>
              Cookies strictement nécessaires.
            </li>

          </ul>

        </div>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          5. Finalités des traitements
        </h2>

        <p>
          Les données sont utilisées exclusivement afin de fournir les
          services proposés par {WEBSITE_URL} .
        </p>

        <div className="overflow-x-auto">

          <table className="w-full border border-slate-200 rounded-2xl overflow-hidden">

            <thead className="bg-slate-100">

              <tr>

                <th className="text-left p-4 font-black">
                  Finalité
                </th>

                <th className="text-left p-4 font-black">
                  Données concernées
                </th>

              </tr>

            </thead>

            <tbody>

              <tr className="border-t">

                <td className="p-4">
                  Création du compte
                </td>

                <td className="p-4">
                  Email, identifiant Clerk
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Authentification
                </td>

                <td className="p-4">
                  Identifiants de connexion
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Analyse de CV
                </td>

                <td className="p-4">
                  CV, description de poste, profil
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Génération de documents
                </td>

                <td className="p-4">
                  Résultats IA
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Gestion des crédits
                </td>

                <td className="p-4">
                  Historique d'utilisation
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Paiements
                </td>

                <td className="p-4">
                  Données de transaction Stripe
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Assistance utilisateur
                </td>

                <td className="p-4">
                  Emails échangés
                </td>

              </tr>

              <tr className="border-t">

                <td className="p-4">
                  Sécurité
                </td>

                <td className="p-4">
                  Adresse IP, journaux techniques
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          6. Bases juridiques du traitement
        </h2>

        <p>
          Les traitements reposent sur les bases juridiques prévues à
          l'article 6 du RGPD.
        </p>

        <ul className="list-disc pl-6 space-y-3">

          <li>
            Exécution du contrat pour la création du compte, les analyses
            de CV, la gestion des crédits et la fourniture du service.
          </li>

          <li>
            Consentement pour les cookies analytiques (Google Analytics).
          </li>

          <li>
            Intérêt légitime pour la sécurité, la prévention de la fraude,
            la journalisation technique et l'amélioration du service.
          </li>

          <li>
            Obligations légales relatives à la conservation de certaines
            données comptables et fiscales.
          </li>

        </ul>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          7. Utilisation de l'intelligence artificielle
        </h2>

        <p>
          {WEBSITE_URL} utilise des modèles d'intelligence artificielle afin
          d'analyser les CV, d'améliorer leur compatibilité avec les offres
          d'emploi et de générer certaines recommandations.
        </p>

        <p>
          Les données transmises aux modèles d'IA sont utilisées uniquement
          afin de produire le résultat demandé par l'utilisateur.
        </p>

        <p>
          Elles ne sont jamais revendues et ne sont pas volontairement
          utilisées par OuiCV pour entraîner des modèles publics.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">

          <p className="font-semibold">
            Les décisions finales concernant un recrutement demeurent
            exclusivement entre les mains des employeurs. Les résultats
            générés par l'IA constituent une assistance à la rédaction et
            non une décision automatisée au sens de l'article 22 du RGPD.
          </p>

        </div>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          8. Destinataires des données et transferts internationaux
        </h2>

        <p>
          Afin de fournir le service {WEBSITE_URL}, certaines données personnelles
          peuvent être traitées par des sous-traitants agissant uniquement
          selon nos instructions et dans le respect du RGPD.
        </p>

        <div className="overflow-x-auto">

          <table className="w-full border border-slate-200 rounded-2xl overflow-hidden">

            <thead className="bg-slate-100">

              <tr>

                <th className="p-4 text-left font-black">
                  Prestataire
                </th>

                <th className="p-4 text-left font-black">
                  Finalité
                </th>

                <th className="p-4 text-left font-black">
                  Localisation
                </th>

              </tr>

            </thead>

            <tbody>

              <tr className="border-t">
                <td className="p-4">Railway</td>
                <td className="p-4">Hébergement de l'application</td>
                <td className="p-4">États-Unis</td>
              </tr>

              <tr className="border-t">
                <td className="p-4">Neon</td>
                <td className="p-4">Base de données PostgreSQL</td>
                <td className="p-4">États-Unis</td>
              </tr>

              <tr className="border-t">
                <td className="p-4">Clerk</td>
                <td className="p-4">Authentification</td>
                <td className="p-4">États-Unis</td>
              </tr>

              <tr className="border-t">
                <td className="p-4">Stripe</td>
                <td className="p-4">Paiements sécurisés</td>
                <td className="p-4">Union Européenne / États-Unis</td>
              </tr>

              <tr className="border-t">
                <td className="p-4">Groq</td>
                <td className="p-4">Traitement IA</td>
                <td className="p-4">États-Unis</td>
              </tr>

              <tr className="border-t">
                <td className="p-4">UploadThing</td>
                <td className="p-4">Stockage sécurisé des fichiers</td>
                <td className="p-4">États-Unis</td>
              </tr>

              <tr className="border-t">
                <td className="p-4">Redis</td>
                <td className="p-4">Cache & limitation de débit</td>
                <td className="p-4">États-Unis</td>
              </tr>

            </tbody>

          </table>

        </div>

        <p>
          Lorsque des données sont transférées en dehors de l'Espace
          Économique Européen, nous nous assurons que ces transferts
          reposent sur un mécanisme reconnu par le RGPD, notamment les
          Clauses Contractuelles Types (SCC), une décision d'adéquation de
          la Commission européenne ou toute autre garantie appropriée.
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          9. Durée de conservation des données
        </h2>

        <p>
          Les données personnelles sont conservées uniquement pendant la
          durée strictement nécessaire aux finalités décrites dans cette
          politique.
        </p>

        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6">

          <ul className="list-disc pl-6 space-y-3">

            <li>
              Compte utilisateur : jusqu'à suppression du compte.
            </li>

            <li>
              CV, profils et analyses : jusqu'à suppression par
              l'utilisateur ou du compte.
            </li>

            <li>
              Données supprimées : conservation temporaire pendant
              <strong> 30 jours </strong>
              avant suppression définitive.
            </li>

            <li>
              Factures : 10 ans conformément aux obligations comptables.
            </li>

            <li>
              Journaux techniques de sécurité : maximum 12 mois.
            </li>

            <li>
              Cookies analytiques : conformément aux choix exprimés par
              l'utilisateur.
            </li>

          </ul>

        </div>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          10. Suppression du compte
        </h2>

        <p>
          Vous pouvez supprimer votre compte directement depuis votre
          espace personnel.
        </p>

        <p>
          Dès la demande de suppression, votre compte devient inaccessible.
        </p>

        <p>
          Vos données sont conservées pendant une période maximale de
          <strong> trente (30) jours </strong>
          afin de permettre la restauration en cas de suppression
          accidentelle, de répondre à d'éventuelles obligations légales
          ou de traiter des incidents de sécurité.
        </p>

        <p>
          À l'issue de cette période, les données sont supprimées de
          manière définitive et irréversible de nos bases de production,
          sous réserve des obligations légales imposant une conservation
          plus longue de certaines informations (notamment comptables).
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          11. Sécurité des données
        </h2>

        <p>
          Nous mettons en œuvre des mesures techniques et
          organisationnelles adaptées afin de protéger les données contre
          la destruction, la perte, l'altération, la divulgation non
          autorisée ou tout accès illicite.
        </p>

        <ul className="list-disc pl-6 space-y-3">

          <li>Connexion HTTPS chiffrée.</li>

          <li>Authentification sécurisée avec Clerk.</li>

          <li>Accès limité aux seules personnes habilitées.</li>

          <li>Surveillance des accès.</li>

          <li>Limitation du nombre de requêtes via Redis.</li>

          <li>Sauvegardes sécurisées.</li>

        </ul>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          12. Vos droits
        </h2>

        <p>
          Conformément au RGPD, vous disposez notamment des droits
          suivants :
        </p>

        <ul className="list-disc pl-6 space-y-3">

          <li>Droit d'accès.</li>

          <li>Droit de rectification.</li>

          <li>Droit à l'effacement.</li>

          <li>Droit à la limitation du traitement.</li>

          <li>Droit à la portabilité.</li>

          <li>Droit d'opposition.</li>

          <li>
            Droit de retirer votre consentement lorsque le traitement
            repose sur celui-ci.
          </li>

          <li>
            Droit de définir le sort de vos données après votre décès,
            conformément à la législation française.
          </li>

        </ul>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          13. Exercice de vos droits
        </h2>

        <p>
          Toute demande relative à vos données personnelles peut être
          adressée à :
        </p>

        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">

          <p>
            <strong>Email :</strong> contact@ouicv.fr
          </p>

        </div>

        <p>
          Afin de protéger vos données, une preuve d'identité pourra être
          demandée lorsque cela est nécessaire.
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          14. Réclamation auprès de la CNIL
        </h2>

        <p>
          Si vous estimez que le traitement de vos données personnelles
          n'est pas conforme à la réglementation applicable, vous pouvez
          introduire une réclamation auprès de la Commission Nationale de
          l'Informatique et des Libertés (CNIL).
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6 mb-12">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          15. Modification de la présente politique
        </h2>

        <p>
          La présente politique peut être modifiée afin de tenir compte
          des évolutions législatives, réglementaires, techniques ou des
          fonctionnalités proposées par {WEBSITE_URL}.
        </p>

        <p>
          La date de dernière mise à jour figure en haut de cette page.
        </p>

      </section>

      {/* ===================================================== */}

      <section className="space-y-6">

        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">
          16. Contact
        </h2>

        <p>
          Pour toute question concernant cette Politique de
          Confidentialité ou le traitement de vos données personnelles,
          vous pouvez nous contacter à l'adresse suivante :
        </p>

        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">

          <p>
            <strong>Email :</strong> contact@ouicv.fr
          </p>

        </div>

      </section>

    </div>
  );
}
