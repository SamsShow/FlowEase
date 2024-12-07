import PaymentWidget from "@requestnetwork/payment-widget/react";

export default function InvoiceList() {
  return (
    <>
      <div className="mt-20">

        <PaymentWidget
          sellerInfo={{
            logo: "https://cdn.pixabay.com/photo/2021/05/24/09/15/ethereum-6278326_1280.png",
            name: "Example Store",
          }}
          productInfo={{
            name: "Digital Art Collection",
            description: "A curated collection of digital artworks.",
            image: "https://cdn.pixabay.com/photo/2021/05/24/09/15/ethereum-6278326_1280.png",
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
      </div>
    </>
  );
}