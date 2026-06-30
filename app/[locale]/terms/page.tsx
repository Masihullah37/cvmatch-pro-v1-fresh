import { useTranslations } from 'next-intl';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 font-sans text-slate-700 leading-relaxed">
      <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight">Conditions Générales de Vente et d'Utilisation (CGVU)</h1>

      <p className="text-sm text-slate-500 mb-12 italic">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">1. Objet</h2>
        <p>
          Les présentes Conditions Générales ont pour objet de définir les modalités de mise à disposition des services de la plateforme
          <strong> CVMatch Pro</strong>, éditée par la société <strong>RushAI</strong>. La plateforme propose des services d'optimisation de CV
          basés sur l'intelligence artificielle pour le marché européen.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">2. Informations sur l'Éditeur</h2>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <p><strong>Société :</strong> RushAI</p>
          <p><strong>Adresse :</strong> 2 Claude Chappe, 37300, Joué-lès-Tours, France</p>
          <p><strong>Email :</strong> contact@ouicv.fr</p>
          <p><strong>Directeur de la publication :</strong> RushAI Team</p>
        </div>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">3. Description des Services et Crédits</h2>
        <p>CVMatch Pro fonctionne sur un système de crédits permettant d'accéder aux fonctionnalités d'analyse et de génération de CV :</p>
        <ul className="list-disc pl-6 space-y-4">
          <li>
            <strong>Abonnement Mensuel :</strong> Donne droit à <strong>30 crédits par mois</strong>.
            Les crédits sont valables pour une durée de <strong>30 jours</strong> et <span className="font-bold text-red-600">ne sont pas reportables</span> sur le mois suivant.
          </li>
          <li>
            <strong>Pack Starter (Achat Unique) :</strong> Donne droit à <strong>5 crédits</strong>.
            Ces crédits sont valables pour une durée de <strong>30 jours</strong> à compter de la date d'achat.
            Passé ce délai, les crédits non utilisés expireront automatiquement.
          </li>
        </ul>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">4. Prix et Paiement</h2>
        <p>
          Les prix de nos services sont indiqués en Euros toutes taxes comprises (TTC). Le paiement est exigible immédiatement
          au moment de la commande. Les transactions sont sécurisées via notre partenaire <strong>Stripe</strong>.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">5. Droit de Rétractation</h2>
        <p>
          Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats
          de fourniture de contenu numérique non fourni sur un support matériel dont l'exécution a commencé après accord préalable
          exprès du consommateur et renoncement exprès à son droit de rétractation.
        </p>
        <p className="bg-amber-50 p-6 rounded-3xl border border-amber-100 text-amber-900 font-medium">
          En utilisant nos services et en générant votre premier CV, vous acceptez expressément que l'exécution du service commence
          immédiatement et vous renoncez à votre droit de rétractation de 14 jours.
          <span className="block mt-2">Aucun remboursement ne sera accordé une fois les crédits utilisés ou consommés.</span>
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">6. Protection des Données (RGPD)</h2>
        <p>
          RushAI s'engage à protéger vos données personnelles. Les données collectées (CV, informations de profil) sont traitées
          uniquement pour la fourniture du service d'optimisation. Vous disposez d'un droit d'accès, de rectification et de
          suppression de vos données via votre espace "Paramètres".
        </p>
        <p>
          <strong>Suppression de compte :</strong> Toute demande de suppression de compte via l'interface dédiée entraîne
          la suppression immédiate et irréversible de l'ensemble de vos données de nos serveurs de production.
        </p>
      </section>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-black text-slate-900 border-l-4 border-primary pl-4 uppercase tracking-tighter">7. Loi Applicable</h2>
        <p>
          Les présentes CGVU sont soumises à la loi française. En cas de litige, les tribunaux français seront seuls compétents.
        </p>
      </section>
    </div>
  );
}
