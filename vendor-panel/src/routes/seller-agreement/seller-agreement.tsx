import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export const SellerAgreement = () => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    t("sellerAgreement.tabs.platformStatus"),
    t("sellerAgreement.tabs.storeDocuments"),
    t("sellerAgreement.tabs.productStandards"),
    t("sellerAgreement.tabs.stockOperations"),
    t("sellerAgreement.tabs.paymentSystem"),
    t("sellerAgreement.tabs.returnDispute"),
    t("sellerAgreement.tabs.privacyKVKK"),
    t("sellerAgreement.tabs.systemSecurity"),
    t("sellerAgreement.tabs.platformReputation"),
    t("sellerAgreement.tabs.approvalEnactment"),
    t("sellerAgreement.tabs.commissionTable"),
  ]

  const tabContents = [
    <div key="0" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.platformStatus")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.platformStatus.content")}
        </p>
      </div>
    </div>,
    <div key="1" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.storeDocuments")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.storeDocuments.content")}
        </p>
      </div>
    </div>,
    <div key="2" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.productStandards")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.productStandards.content")}
        </p>
      </div>
    </div>,
    <div key="3" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.stockOperations")}</h2>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">{t("sellerAgreement.sections.stockOperations.subhead1")}</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.stockOperations.content1")}
        </p>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">{t("sellerAgreement.sections.stockOperations.subhead2")}</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.stockOperations.content2")}
        </p>
      </div>
    </div>,
    <div key="4" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.paymentSystem")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.paymentSystem.content")}
        </p>
      </div>
    </div>,
    <div key="5" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.returnDispute")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.returnDispute.content")}
        </p>
      </div>
    </div>,
    <div key="6" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.privacyKVKK")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.privacyKVKK.content")}
        </p>
      </div>
    </div>,
    <div key="7" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.systemSecurity")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.systemSecurity.content")}
        </p>
      </div>
    </div>,
    <div key="8" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.platformReputation")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.platformReputation.content")}
        </p>
      </div>
    </div>,
    <div key="9" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.approvalEnactment")}</h2>
      <div className="space-y-4">
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          {t("sellerAgreement.sections.approvalEnactment.content")}
        </p>
      </div>
    </div>,
    <div key="10" className="space-y-6">
      <h2 className="text-2xl font-bold text-ui-fg-base">{t("sellerAgreement.tabs.commissionTable")}</h2>
      <p className="text-sm text-ui-fg-subtle">
        {t("sellerAgreement.sections.commissionTable.description")}
      </p>
      <div className="overflow-x-auto rounded-lg border border-ui-border-base">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ui-bg-base border-b border-ui-border-base">
              <th className="px-4 py-3 text-left font-semibold text-ui-fg-base">{t("sellerAgreement.sections.commissionTable.col.category")}</th>
              <th className="px-4 py-3 text-center font-semibold text-ui-fg-base">{t("sellerAgreement.sections.commissionTable.col.netCommission")}</th>
              <th className="px-4 py-3 text-center font-semibold text-ui-fg-base">{t("sellerAgreement.sections.commissionTable.col.vat")}</th>
              <th className="px-4 py-3 text-center font-semibold text-ui-fg-base">{t("sellerAgreement.sections.commissionTable.col.totalInclVat")}</th>
            </tr>
          </thead>
          <tbody>
            {[
              { categoryKey: "womenFashion", net: 10, kdv: 20, total: 12 },
              { categoryKey: "menFashion", net: 10, kdv: 20, total: 12 },
              { categoryKey: "electronics", net: 10, kdv: 20, total: 12 },
              { categoryKey: "motherChild", net: 10, kdv: 20, total: 12 },
              { categoryKey: "homeLife", net: 10, kdv: 20, total: 12 },
              { categoryKey: "supermarket", net: 4, kdv: 20, total: 4.8 },
              { categoryKey: "cosmetics", net: 10, kdv: 20, total: 12 },
              { categoryKey: "shoesBags", net: 14, kdv: 20, total: 16.8 },
              { categoryKey: "sportsOutdoor", net: 14, kdv: 20, total: 16.8 },
              { categoryKey: "booksHobbies", net: 4, kdv: 20, total: 4.8 },
              { categoryKey: "autoMoto", net: 10, kdv: 20, total: 12 },
              { categoryKey: "privateLife", net: 20, kdv: 20, total: 24 },
            ].map((row, i) => (
              <tr
                key={row.categoryKey}
                className={i % 2 === 0 ? "bg-ui-bg-subtle" : "bg-ui-bg-base"}
              >
                <td className="px-4 py-3 font-medium text-ui-fg-base">{t(`sellerAgreement.sections.commissionTable.categories.${row.categoryKey}`)}</td>
                <td className="px-4 py-3 text-center text-ui-fg-subtle">%{row.net}</td>
                <td className="px-4 py-3 text-center text-ui-fg-subtle">%{row.kdv}</td>
                <td className="px-4 py-3 text-center font-semibold text-ui-fg-base">%{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ui-fg-muted">
        {t("sellerAgreement.sections.commissionTable.footnote")}
      </p>
    </div>,
  ]

  return (
    <div className="bg-ui-bg-subtle min-h-dvh">
      <div className="px-6 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            to="/register"
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors text-sm font-medium inline-flex items-center gap-1"
          >
            {t("sellerAgreement.backToRegister")}
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ui-fg-base leading-tight mb-2">
            {t("sellerAgreement.title")}
          </h1>
          <p className="text-sm font-bold text-ui-fg-subtle">
            {t("sellerAgreement.lastUpdated")}
          </p>
        </div>

        {/* Tab navigation */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1 min-w-max border-b border-ui-border-base pb-0">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={[
                  "px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors rounded-t-md",
                  activeTab === index
                    ? "bg-ui-bg-base text-ui-fg-base border border-b-0 border-ui-border-base"
                    : "text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base/50",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-ui-bg-base rounded-lg border border-ui-border-base p-6">
          {tabContents[activeTab]}
        </div>
      </div>
    </div>
  )
}
