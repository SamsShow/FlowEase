import PaymentWidget from "@requestnetwork/payment-widget/react";

export default function InvoiceList() {
  return (
    <PaymentWidget
      sellerInfo={{
        logo: "https://example.com/logo.png",
        name: "Example Store",
      }}
      productInfo={{
        name: "Digital Art Collection",
        description: "A curated collection of digital artworks.",
        image: "https://example.com/product-image.jpg",
      }}
      amountInUSD={1.5}
      sellerAddress="0x87D5f4E0295c42C411320A882a0C1a2D8d36e1e5" // FREELANCER Ethereum address here
      supportedCurrencies={["REQ-mainnet", "ETH-sepolia-sepolia", "USDC-mainnet"]}
      persistRequest={true}
      onPaymentSuccess={(request) => {
        console.log(request);
      }}
      onError={(error) => {
        console.error(error);
      }}
    />
  );
}