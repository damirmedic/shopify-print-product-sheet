import { useEffect, useState } from "react";
import {
  reactExtension,
  useApi,
  AdminPrintAction,
  BlockStack,
  Text,
} from "@shopify/ui-extensions-react/admin";

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = "admin.product-details.print-action.render";

export default reactExtension(TARGET, () => <App />);

function App() {
  // The useApi hook provides access to several useful APIs like i18n and data.
  const { i18n, data } = useApi(TARGET);
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (data.selected?.length > 0) {
      const params = new URLSearchParams({
        productId: data.selected[0].id,
      });

      const fullSrc = `/print?${params.toString()}`;
      setSrc(fullSrc);
    } else {
      setSrc(null);
    }
  }, [data.selected]);

  return (
    <AdminPrintAction src={src}>
      <BlockStack blockGap="base">
        <Text fontWeight="bold">{i18n.translate("printDetails")}</Text>
      </BlockStack>
    </AdminPrintAction>
  );
}
