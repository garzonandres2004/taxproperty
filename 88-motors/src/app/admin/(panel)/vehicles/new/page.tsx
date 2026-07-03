import VehicleForm from "@/components/admin/VehicleForm";

export default function NewVehiclePage() {
  return (
    <div>
      <h1 className="text-2xl font-black">Agregar carro</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">
        Llena la información una sola vez — de aquí sale la página web, la plantilla de
        Marketplace, el post de Facebook y el caption de Instagram.
      </p>
      <VehicleForm />
    </div>
  );
}
