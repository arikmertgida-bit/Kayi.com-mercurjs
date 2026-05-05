import { SingleColumnPage } from "../../../components/layout/pages";
import { useExtension } from "../../../providers/extension-provider";
import { SellerListTable } from "./components/seller-list-table";

export const SellersList = () => {
  const { getWidgets } = useExtension();

  return (
    <SingleColumnPage
      widgets={{
        after: getWidgets("seller.list.after"),
        before: getWidgets("seller.list.before"),
      }}
      hasOutlet={false}
    >
      <SellerListTable />
    </SingleColumnPage>
  );
};

