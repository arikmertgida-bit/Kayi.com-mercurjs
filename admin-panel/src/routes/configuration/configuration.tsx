import { useState } from "react";

import {
  Button,
  Container,
  Drawer,
  Heading,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import {
  useConfigurationRules,
  useUpdateConfigurationRule,
} from "@hooks/api/configuration";

import CreateConfigurationRuleForm from "@routes/configuration/components/create-rule-form";
import {
  ConfigurationRuleTooltip,
  type RuleType,
} from "@routes/configuration/components/rule-tooltip";

export const Configuration = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { configuration_rules, isLoading, refetch } = useConfigurationRules({});
  const { mutateAsync: updateConfigurationRule } = useUpdateConfigurationRule(
    {},
  );

  const updateRule = async (id: string, is_enabled: boolean) => {
    try {
      await updateConfigurationRule({ id, is_enabled });
      toast.success(t("configuration.updated"));
      refetch();
    } catch {
      toast.error(t("configuration.error"));
    }
  };

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("configuration.header")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("configuration.subtitle")}
          </Text>
        </div>
        <Drawer
          open={open}
          onOpenChange={(openChanged) => setOpen(openChanged)}
        >
          <Drawer.Trigger
            onClick={() => {
              setOpen(true);
            }}
            asChild
          >
            <Button>{t("actions.create")}</Button>
          </Drawer.Trigger>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>{t("configuration.createRulesTitle")}</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <CreateConfigurationRuleForm
                onSuccess={() => {
                  setOpen(false);
                  refetch();
                }}
              />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer>
      </div>
      <div className="flex size-full flex-col overflow-hidden">
        {isLoading && <Text>{t("general.loading")}</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("configuration.ruleTypeColumn")}</Table.HeaderCell>
              <Table.HeaderCell>{t("configuration.enabledColumn")}</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {configuration_rules?.map((rule) => (
              <Table.Row key={rule.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <ConfigurationRuleTooltip
                      type={rule.rule_type as RuleType}
                    />
                    {rule.rule_type}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge color={rule.is_enabled ? "green" : "grey"}>
                    {rule.is_enabled ? t("filters.radio.true") : t("filters.radio.false")}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      updateRule(rule.id!, !rule.is_enabled);
                    }}
                  >
                    {rule.is_enabled ? t("general.disabled") : t("general.enabled")}
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  );
};
