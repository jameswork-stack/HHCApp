
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import "../styles/compliance.css";

export default function Compliance() {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [departmentsInput, setDepartmentsInput] = useState([""]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================
  // LOAD LOCATIONS FROM FIRESTORE
  // =====================================

  useEffect(() => {
    const locationsRef = collection(db, "locations");

    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const locationList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        locationList.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

        setLocations(locationList);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading locations:", err);
        setError("Unable to load locations. Please check your permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =====================================
  // SELECTED LOCATION
  // =====================================

  const selectedLocation = locations.find(
    (location) => location.id === selectedLocationId
  );

  const departments = selectedLocation?.departments || [];

  // =====================================
  // HANDLE LOCATION CHANGE
  // =====================================

  const handleLocationChange = (e) => {
    setSelectedLocationId(e.target.value);
    setSelectedDepartment("");
    setError("");
    setSuccess("");
  };

  // =====================================
  // ADD LOCATION / DEPARTMENT
  // =====================================

const handleSaveLocation = async (e) => {
  e.preventDefault();

  const cleanLocationName = locationName.trim();

  const cleanDepartments = [
    ...new Set(
      departmentsInput
        .map((department) => department.trim())
        .filter((department) => department !== "")
        .map((department) => department)
    ),
  ];

  if (!cleanLocationName) {
    setError("Please enter a location name.");
    return;
  }

  if (cleanDepartments.length === 0) {
    setError("Please add at least one department.");
    return;
  }

  setSaving(true);
  setError("");
  setSuccess("");

  try {
    const existingLocation = locations.find(
      (location) =>
        (location.name || "").trim().toLowerCase() ===
        cleanLocationName.toLowerCase()
    );

    let locationId;

    if (existingLocation) {
      locationId = existingLocation.id;

      const existingDepartments = existingLocation.departments || [];

      const duplicateDepartments = cleanDepartments.filter(
        (department) =>
          existingDepartments.some(
            (existing) =>
              existing.trim().toLowerCase() ===
              department.toLowerCase()
          )
      );

      const newDepartments = cleanDepartments.filter(
        (department) =>
          !existingDepartments.some(
            (existing) =>
              existing.trim().toLowerCase() ===
              department.toLowerCase()
          )
      );

      if (newDepartments.length === 0) {
        setError("All entered departments already exist in this location.");
        setSaving(false);
        return;
      }

      await updateDoc(doc(db, "locations", locationId), {
        departments: arrayUnion(...newDepartments),
      });

      setSuccess(
        `${newDepartments.length} department(s) added successfully.`
      );
    } else {
      const newLocation = await addDoc(
        collection(db, "locations"),
        {
          name: cleanLocationName,
          departments: cleanDepartments,
          createdAt: serverTimestamp(),
        }
      );

      locationId = newLocation.id;

      setSuccess("Location and departments added successfully.");
    }

    setSelectedLocationId(locationId);
    setSelectedDepartment("");

    setLocationName("");
    setDepartmentsInput([""]);
    setShowAddForm(false);
  } catch (err) {
    console.error("Error saving location:", err);
    setError("Unable to save. Please check your Firestore permissions.");
  } finally {
    setSaving(false);
  }
};

// =====================================
// ADD / REMOVE DEPARTMENT INPUT FIELDS
// =====================================

const handleAddDepartmentField = () => {
  setDepartmentsInput((prev) => [...prev, ""]);
};

const handleDepartmentInputChange = (index, value) => {
  setDepartmentsInput((prev) =>
    prev.map((department, i) =>
      i === index ? value : department
    )
  );
};

const handleRemoveDepartmentField = (index) => {
  setDepartmentsInput((prev) =>
    prev.filter((_, i) => i !== index)
  );
};


  // =====================================
  // CLOSE FORM
  // =====================================

  const handleCloseForm = () => {
  if (saving) return;

  setShowAddForm(false);
  setLocationName("");
  setDepartmentsInput([""]);
  setError("");
};

  return (
    <div className="compliance-page">

      <div className="compliance-header">
        <div>
          <h1>Compliance</h1>
          <p>Select a location and department to continue.</p>
        </div>
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="compliance-success">
          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && !showAddForm && (
        <div className="compliance-error">
          {error}
        </div>
      )}

      {/* LOCATION AND DEPARTMENT SELECTION */}
<div className="selection-card">

  {/* LOCATION */}
  <div className="selection-field location-selection-field">
    <label htmlFor="location-select">
      Location
    </label>

    <div className="location-select-row">
      <select
        id="location-select"
        value={selectedLocationId}
        onChange={handleLocationChange}
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading locations..." : "Select Location"}
        </option>

        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="add-location-inline-btn"
        onClick={() => {
          setError("");
          setSuccess("");
          setShowAddForm(true);
        }}
      >
        <span className="desktop-add-text">+ Add Location</span>
        <span className="mobile-add-text">+ Add</span>
      </button>
    </div>
  </div>

  {/* DEPARTMENT */}
  <div className="selection-field">
    <label htmlFor="department-select">
      Department
    </label>

    <select
      id="department-select"
      value={selectedDepartment}
      onChange={(e) => setSelectedDepartment(e.target.value)}
      disabled={!selectedLocationId || departments.length === 0}
    >
      <option value="">
        {!selectedLocationId
          ? "Select a location first"
          : "Select Department"}
      </option>

      {departments.map((department, index) => (
        <option key={`${department}-${index}`} value={department}>
          {department}
        </option>
      ))}
    </select>
  </div>

</div>
      {/* ADD LOCATION MODAL */}
      {showAddForm && (
        <div
          className="location-modal-overlay"
          onClick={handleCloseForm}
        >
          <div
            className="location-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="location-modal-header">
              <div>
                <h2>Add Location</h2>
                <p>Create a location and add its department.</p>
              </div>

              <button
                type="button"
                className="close-modal-btn"
                onClick={handleCloseForm}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveLocation}>

              <div className="selection-field">
                <label htmlFor="new-location-name">
                  Location Name
                </label>

                <input
                  id="new-location-name"
                  type="text"
                  placeholder="Enter location name"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                />
              </div>

              <div className="selection-field">
  <label>Departments</label>

  <div className="department-input-list">
    {departmentsInput.map((department, index) => (
      <div className="department-input-row" key={index}>
        <input
          type="text"
          placeholder={`Department ${index + 1}`}
          value={department}
          onChange={(e) =>
            handleDepartmentInputChange(index, e.target.value)
          }
        />

        {departmentsInput.length > 1 && (
          <button
            type="button"
            className="remove-department-btn"
            onClick={() => handleRemoveDepartmentField(index)}
            disabled={saving}
          >
            ×
          </button>
        )}
      </div>
    ))}
  </div>

  <button
    type="button"
    className="add-department-field-btn"
    onClick={handleAddDepartmentField}
    disabled={saving}
  >
    + Add Another Department
  </button>
</div>

              {error && (
                <div className="compliance-error">
                  {error}
                </div>
              )}

              <div className="location-modal-actions">
                <button
                  type="button"
                  className="cancel-location-btn"
                  onClick={handleCloseForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-location-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Location"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
