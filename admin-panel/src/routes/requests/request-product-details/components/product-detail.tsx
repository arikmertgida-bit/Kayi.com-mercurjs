import { useState } from "react";

import type { ProductDTO } from "@medusajs/types";
import { Badge, Button, Container, Heading, Table } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { Link, useNavigate } from "react-router-dom";

import { LoadingSpinner } from "@components/common/loading-spinner";
import { TwoColumnLayout } from "@components/layout/two-column-layout";

import {
  useCollection,
  useProductCategory,
  useProductTags,
  useProductType,
} from "@hooks/api";
import { useVendorRequest } from "@hooks/api/requests";

import { ResolveRequestPrompt } from "@routes/requests/common/components/resolve-request";
import { SectionRow } from "@routes/requests/common/components/section-row";

export const ProductRequestDetail = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { request, isError, isLoading } = useVendorRequest(id!);
  const requestData = request?.data as ProductDTO;

  const [promptOpen, setPromptOpen] = useState(false);
  const [requestAccept, setRequestAccept] = useState(false);

  const handlePrompt = (_: string, accept: boolean) => {
    setRequestAccept(accept);
    setPromptOpen(true);
  };

  if (!request || isLoading || isError) {
    return <LoadingSpinner />;
  }

  return (
    <TwoColumnLayout
      firstCol={
        <>
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading>{requestData.title}</Heading>
              <ResolveRequestPrompt
                close={() => {
                  setPromptOpen(false);
                }}
                open={promptOpen}
                id={request.id!}
                accept={requestAccept}
                onSuccess={() => {
                  close();
                  navigate("/requests/product");
                }}
              />
              <div className="flex items-center gap-x-4">
                <Button
                  onClick={() => {
                    handlePrompt(id, true);
                  }}
                >
                  {t("requests.detail.accept")}
                </Button>
                <Button
                  onClick={() => {
                    handlePrompt(id, false);
                  }}
                  variant="danger"
                >
                  {t("requests.detail.reject")}
                </Button>
              </div>
            </div>

            <SectionRow title={t("fields.description")} value={requestData.description} />
            <SectionRow title={t("fields.subtitle")} value={requestData.subtitle} />
            <SectionRow
              title={t("fields.handle")}
              value={requestData.handle ? `/${requestData.handle}` : "-"}
            />
            <SectionRow
              title={t("fields.discountable")}
              value={requestData.discountable ? t("fields.yes") : t("fields.no")}
            />
          </Container>
          <ProductOptionsInfo product={requestData} />
          <ProductVariantInfo product={requestData} />
        </>
      }
      secondCol={
        <>
          <ProductOrganizationInfo product={requestData} />
          <ProductAttributeInfo product={requestData} />
        </>
      }
    />
  );
};

const ProductOptionsInfo = ({ product }: { product: ProductDTO }) => {
  const { t } = useTranslation();
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("requests.detail.options")}</Heading>
      </div>

      {product.options?.map((option) => {
        return (
          <SectionRow
            title={option.title}
            key={option.title}
            value={option.values?.map((val) => {
              return (
                <Badge
                  key={`${option.title}-${val}`}
                  size="2xsmall"
                  className="flex min-w-[20px] items-center justify-center"
                >
                  {String(val)}
                </Badge>
              );
            })}
          />
        );
      })}
    </Container>
  );
};

const ProductVariantInfo = ({ product }: { product: ProductDTO }) => {
  const { t } = useTranslation();
  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("requests.detail.variants")}</Heading>
        </div>
      </div>
      <div className="flex size-full flex-col overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("fields.title")}</Table.HeaderCell>
              <Table.HeaderCell>{t("fields.sku")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {product.variants?.map((v) => {
              return (
                <Table.Row key={v.title}>
                  <Table.Cell>{v.title || "-"}</Table.Cell>
                  <Table.Cell>{v.sku || "-"}</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </Container>
  );
};

const ProductOrganizationInfo = ({ product }: { product: ProductDTO }) => {
  const { t } = useTranslation();
  let category_name = "";
  let category_id = "";
  let collection_name = "";
  let type_name = "";
  const productTags: { id: string; value: string }[] = [];

  if (product.categories && product.categories[0]) {
    category_id = product.categories[0].id;
    const { product_category } = useProductCategory(category_id);
    category_name = product_category?.name || "";
  }

  if (product.collection_id) {
    const { collection } = useCollection(product.collection_id);
    collection_name = collection?.title || "";
  }

  if (product.type_id) {
    const { product_type } = useProductType(product.type_id);
    type_name = product_type?.value || "";
  }

  if (product.tags && product.tags.length) {
    const tagIds = product.tags.map((t) => t.id);
    const { product_tags } = useProductTags({ id: tagIds });
    product_tags?.forEach((t) =>
      productTags.push({ id: t.id, value: t.value }),
    );
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("requests.detail.organization")}</Heading>
      </div>

      <SectionRow
        title={t("fields.tags")}
        value={
          productTags
            ? productTags.map((tag) => (
                <Badge key={tag.id} className="w-fit" size="2xsmall" asChild>
                  <Link to={`/products?tag_id=${tag.id}`}>{tag.value}</Link>
                </Badge>
              ))
            : undefined
        }
      />
      <SectionRow
        title={t("fields.type")}
        value={
          type_name ? (
            <Badge size="2xsmall" className="w-fit" asChild>
              <Link to={`/products?type_id=${product.type_id}`}>
                {type_name}
              </Link>
            </Badge>
          ) : undefined
        }
      />

      <SectionRow
        title={t("fields.collection")}
        value={
          collection_name ? (
            <Badge size="2xsmall" className="w-fit" asChild>
              <Link to={`/collections/${product.collection_id}`}>
                {collection_name}
              </Link>
            </Badge>
          ) : undefined
        }
      />

      <SectionRow
        title={t("fields.category")}
        value={
          category_name ? (
            <Badge key={category_id} className="w-fit" size="2xsmall" asChild>
              <Link to={`/categories/${category_id}`}>{category_name}</Link>
            </Badge>
          ) : undefined
        }
      />
    </Container>
  );
};

const ProductAttributeInfo = ({ product }: { product: ProductDTO }) => {
  const { t } = useTranslation();
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("requests.detail.attributes")}</Heading>
      </div>
      <SectionRow title={t("fields.height")} value={product.height} />
      <SectionRow title={t("fields.width")} value={product.width} />
      <SectionRow title={t("fields.length")} value={product.length} />
      <SectionRow title={t("fields.weight")} value={product.weight} />
      <SectionRow title={t("fields.midCode")} value={product.mid_code} />
      <SectionRow title={t("fields.hsCode")} value={product.hs_code} />
      <SectionRow title={t("fields.countryOfOrigin")} value={product.origin_country} />
    </Container>
  );
};
