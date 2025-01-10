import { authenticate } from "../shopify.server";
import QRCode from "qrcode";

export async function loader({ request }) {
  const { cors, admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  // Fetch product details
  const response = await admin.graphql(
    `query getProduct($productId: ID!) {
      product(id: $productId) {
        title
        handle
        totalInventory
        onlineStoreUrl
        featuredImage {
          url
        }
        variants(first: 1) {
          edges {
            node {
              sku
            }
          }
        }
        metafield(namespace: "custom", key: "zustand") {
          value
        }
      }
      shop {
        url
      }
    }`,
    {
      variables: {
        productId: productId,
      },
    },
  );

  const metaStandort = await admin.graphql(
    `query getProduct($productId: ID!) {
      product(id: $productId) {
        metafield(namespace: "custom", key: "standort") {
          value
        }
      }
    }`,
    {
      variables: {
        productId: productId,
      },
    },
  );

  const productData = await response.json();
  const standortData = await metaStandort.json();
  const product = productData.data.product;
  const shopUrl = productData.data.shop.url;
  const zustand = JSON.parse(product.metafield.value)[0];
  const standort = standortData.data.product.metafield.value;

  // Ensure product exists
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  const qrCodeString = `${shopUrl}/products/${product.handle}?utm_source=QR`;

  // Generate QR Code for product URL (fallback to empty string if no URL)
  const qrCodeDataUrl = qrCodeString
    ? await QRCode.toDataURL(qrCodeString)
    : null;

  // Build the HTML template
  const productTemplate = `<main>
      <div>
        <img src="https://www.bueroaufloesung.ch/cdn/shop/files/Logo.png?v=1730824553" style="max-width: 250px; height: auto; margin: 0 auto 50px auto;" />
        <h1>${product.title}</h1>

        <div class="row" style="margin-top: 30px;margin-bottom: 60px;">
          <div class="col-6">
            ${
              qrCodeDataUrl
                ? `<img src="${qrCodeDataUrl}" style="width: 75%; height: auto; margin-top: -25px;margin-left: -25px;margin-bottom: 0;" />`
                : "<p>No QR Code available for this product.</p>"
            }
            <div class="qr-code-text">
              <p class="f-15">QR LINK ZUM SHOP</p>
              <p class="f-12" style="margin-bottom: 15px;">Artikel Nr. ${product.variants.edges[0]?.node.sku}</p>
              <p class="f-10">Durch das Scannen des QR-Links gelangen Sie in useren Online-Shop, auf welchem Sie weitere Informationen zum Produkt finden und es <span class="underline">direkt kaufen</span> oder Ihr <span class="underline">Ineresse bekunden</span> können.</p>
            </div>
          </div>
          <div class="col-6">
            ${
              product.featuredImage
                ? `<img src="${product.featuredImage.url}" style="max-width: 100%; height: auto;" />`
                : ""
            }
          </div>
        </div>

        <div style="margin-bottom: 150px;">
          <p class="f-15">Haben Sie Fragen?</p>
          <p class="f-15">Senden Sie Ihre Frage mit einem Foto dieser Etikette per WhatsApp an: <span class="underline">076 420 00 40</span></p>
          <br>
          <p class="f-15">Vielen Dank!</p>
        </div>

        <div class="interne-info">
          <p class="f-12">Interne Informationen</p>
          <p class="f-12">Menge Total: ${product.totalInventory}</p>
          <p class="f-12">Standorte: ${standort}</p>
          <p class="f-12">Zustand: ${zustand}</p>
        </div>

      </div>
    </main>`;

  // Generate the full HTML response
  const print = printHTML([productTemplate]);
  return cors(
    new Response(print, {
      status: 200,
      headers: {
        "Content-type": "text/html",
      },
    }),
  );
}

const title = `<title>Product Printer</title>`;

function printHTML(pages) {
  const joinedPages = pages.join("");
  const printTemplate = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=utf-8">
    <style>
      body, html {
        font-size: 16px;
        line-height: 1.35;
        margin: 0;
        padding: 0;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      main {
        padding: 2rem 1rem;
      }
      h1 {
        font-size: 28px;
        font-weight: 400;
        margin-bottom: 40px;
      }
      img {
        display: block;
        max-width: 100%;
        height: auto;
      }
      p {
        font-size: 1rem;
        margin: 0;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 30px;
        justify-content: space-between;
      }
      .col-6 {
        flex: 0 0 calc(50% - 15px);
      }
      .qr-code-text {
        padding-left: 0px;
      }
      .underline {
        text-decoration: underline;
      }
      .f-10 {
        font-size: 10px;
      }
      .f-12 {
        font-size: 12px;
      }
      .f-13 {
        font-size: 13px;
      }
      .f-15 {
        font-size: 15px;
      }
      .f-18 {
        font-size: 18px;
      }
      .interne-info p {
        margin-bottom: 15px;
      }
    </style>
    ${title}
  </head>
  <body>
    ${joinedPages}
  </body>
  </html>`;
  return printTemplate;
}
