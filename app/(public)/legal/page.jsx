export default function LegalPage() {
  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-4xl mx-auto py-14 text-slate-700">
        <h1 className="text-3xl font-semibold text-slate-800">Legal and Policies</h1>
        <p className="mt-4">
          By using ThriftStore, you agree to platform terms, refund policy, and seller compliance rules.
        </p>
        <div className="mt-8 space-y-5 text-sm leading-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Terms of Use</h2>
            <p>Users must provide accurate account details and follow platform guidelines while buying or selling.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Privacy Policy</h2>
            <p>We store only required order and account data to serve purchases, support, and account security.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Refund Policy</h2>
            <p>Refund eligibility depends on order status and seller rules. Check order details before requesting cancellation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
