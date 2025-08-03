import MainLayout from "@/components/layout/main-layout";

export default function Customers() {
  return (
    <MainLayout title="CRM & Customers">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">CRM & Customers</h2>
        <p className="text-gray-600 dark:text-gray-400">
          CRM and customer management functionality will be implemented here.
        </p>
      </div>
    </MainLayout>
  );
}
