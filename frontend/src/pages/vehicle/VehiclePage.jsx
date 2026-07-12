import { useEffect, useState } from "react";
import {
  getVehicles,
  createVehicle,
  deleteVehicle,
} from "../../api/vehicle.api";

const initialForm = {
  registration_no: "",
  vehicle_name: "",
  vehicle_type: "",
  max_load_capacity: "",
  odometer: "",
  acquisition_cost: "",
};

function VehiclePage() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await getVehicles();
      setVehicles(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVehicles();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const formattedForm = {
        ...form,
        max_load_capacity: form.max_load_capacity ? Number(form.max_load_capacity) : null,
        odometer: form.odometer ? Number(form.odometer) : 0,
        acquisition_cost: form.acquisition_cost ? Number(form.acquisition_cost) : null,
      };

      await createVehicle(formattedForm);

      setForm(initialForm);

      fetchVehicles();
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;

    try {
      await deleteVehicle(id);
      fetchVehicles();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-8">
        Vehicle Management
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-4 bg-white shadow rounded-xl p-6 mb-10"
      >

        <input
          type="text"
          name="registration_no"
          placeholder="Registration No"
          value={form.registration_no}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <input
          type="text"
          name="vehicle_name"
          placeholder="Vehicle Name"
          value={form.vehicle_name}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <input
          type="text"
          name="vehicle_type"
          placeholder="Vehicle Type"
          value={form.vehicle_type}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <input
          type="number"
          name="max_load_capacity"
          placeholder="Capacity"
          value={form.max_load_capacity}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <input
          type="number"
          name="odometer"
          placeholder="Odometer"
          value={form.odometer}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <input
          type="number"
          name="acquisition_cost"
          placeholder="Acquisition Cost"
          value={form.acquisition_cost}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded"
        >
          {loading ? "Saving..." : "Add Vehicle"}
        </button>

      </form>

      <div className="bg-white shadow rounded-xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-100">

            <tr>

              <th className="p-3">Registration</th>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Capacity</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>

            </tr>

          </thead>

          <tbody>

            {vehicles.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10"
                >
                  No Vehicles Found
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-t"
                >
                  <td className="p-3">
                    {vehicle.registration_no}
                  </td>

                  <td className="p-3">
                    {vehicle.vehicle_name}
                  </td>

                  <td className="p-3">
                    {vehicle.vehicle_type}
                  </td>

                  <td className="p-3">
                    {vehicle.max_load_capacity}
                  </td>

                  <td className="p-3">
                    {vehicle.status}
                  </td>

                  <td className="p-3">

                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      Delete
                    </button>

                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default VehiclePage;