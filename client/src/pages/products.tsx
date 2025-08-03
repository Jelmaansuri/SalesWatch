import MainLayout from "@/components/layout/main-layout";

export default function Products() {
  return (
    <MainLayout title="Product Management">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Product Management</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Product management functionality will be implemented here.
        </p>
      </div>
    </MainLayout>
  );
}
