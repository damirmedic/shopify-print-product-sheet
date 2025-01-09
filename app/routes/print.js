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
        onlineStoreUrl
        featuredImage {
          url
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
    }
  );

  const productData = await response.json();
  const product = productData.data.product;
  const shopUrl = productData.data.shop.url;

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
        <h1>${product.title}</h1>
        ${
          product.featuredImage
            ? `<img src="${product.featuredImage.url}" alt="${product.title}" style="max-width: 100%; height: auto; margin-top: 1rem;" />`
            : ""
        }
        ${
          qrCodeDataUrl
            ? `<img src="${qrCodeDataUrl}" alt="QR Code for ${product.title}" style="max-width: 150px; height: auto; margin-top: 1rem;" />`
            : "<p>No QR Code available for this product.</p>"
        }
        <p>${shopUrl}</p>
        <p>Scan the QR code to view this product in our online shop, where you can find more information, purchase it, or express your interest.</p>
        <p>Do you have questions?<br>Send your question with a photo of this label via WhatsApp to 076 420 00 40. Thank you!</p>
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
    })
  );
}

const title = `<title>Product Printer</title>`;

function printHTML(pages) {
  const joinedPages = pages.join("");
  const printTemplate = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <style>
      body, html {
        font-size: 16px;
        line-height: normal;
        margin: 0;
        padding: 0;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      }
      main {
        padding: 3rem 2rem;
      }
      h1 {
        font-size: 2.5rem;
        font-weight: 400;
        margin: 0;
      }
      img {
        display: block;
        max-width: 100%;
        height: auto;
        margin-top: 1rem;
      }
      p {
        font-size: 1rem;
        margin: 1rem 0;
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
