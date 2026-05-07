import { SingleColumnPage } from "../../../components/layout/pages";
import { useExtension } from "../../../providers/extension-provider";
import { SellerListTable } from "./components/seller-list-table";

export const SellersList = () => {
  const { getWidgets } = useExtension();

  return (
    <SingleColumnPage
      widgets={{
        after: getWidgets("seller.list.after" as any),
        before: getWidgets("seller.list.before" as any),
      }}
      hasOutlet={false}
    >
      <SellerListTable />
    </SingleColumnPage>
  );
};

