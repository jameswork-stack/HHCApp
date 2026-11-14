
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

  // =====================================
// PERSONNEL STATES
// =====================================

const [personnel, setPersonnel] = useState([]);
const [selectedPersonnel, setSelectedPersonnel] = useState("");

const [showPersonnelForm, setShowPersonnelForm] = useState(false);
const [personnelLocationId, setPersonnelLocationId] = useState("");
const [personnelDepartment, setPersonnelDepartment] = useState("");
const [staffNamesInput, setStaffNamesInput] = useState([""]);

const [personnelSaving, setPersonnelSaving] = useState(false);

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
// LOAD PERSONNEL FROM FIRESTORE
// =====================================

useEffect(() => {
  const personnelRef = collection(db, "personnel");

  const unsubscribe = onSnapshot(
    personnelRef,
    (snapshot) => {
      const personnelList = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      personnelList.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );

      setPersonnel(personnelList);
    },
    (err) => {
  console.error("Error loading personnel:", err.code, err.message);
  setError(`Unable to load personnel: ${err.message}`);
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
  setSelectedPersonnel("");
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
// FILTER PERSONNEL BY LOCATION + DEPARTMENT
// =====================================

const filteredPersonnel = personnel.filter(
  (person) =>
    person.locationId === selectedLocationId &&
    person.department === selectedDepartment
);

// =====================================
// PERSONNEL FORM DEPARTMENTS
// =====================================

const personnelFormLocation = locations.find(
  (location) => location.id === personnelLocationId
);

const personnelFormDepartments =
  personnelFormLocation?.departments || [];

// =====================================
// ADD / REMOVE STAFF INPUT FIELDS
// =====================================

const handleAddStaffField = () => {
  setStaffNamesInput((prev) => [...prev, ""]);
};

const handleStaffNameChange = (index, value) => {
  setStaffNamesInput((prev) =>
    prev.map((name, i) => (i === index ? value : name))
  );
};

const handleRemoveStaffField = (index) => {
  setStaffNamesInput((prev) =>
    prev.filter((_, i) => i !== index)
  );
};

// =====================================
// SAVE PERSONNEL
// =====================================

const handleSavePersonnel = async (e) => {
  e.preventDefault();

  const cleanStaffNames = [
    ...new Set(
      staffNamesInput
        .map((name) => name.trim())
        .filter((name) => name !== "")
        .map((name) => name)
    ),
  ];

  if (!personnelLocationId) {
    setError("Please select a location.");
    return;
  }

  if (!personnelDepartment) {
    setError("Please select a department.");
    return;
  }

  if (cleanStaffNames.length === 0) {
    setError("Please enter at least one staff name.");
    return;
  }

  const selectedFormLocation = locations.find(
    (location) => location.id === personnelLocationId
  );

  if (
    !selectedFormLocation?.departments?.includes(personnelDepartment)
  ) {
    setError("Please select a valid department.");
    return;
  }

  // Prevent duplicate names within the same location and department.
  const duplicateNames = cleanStaffNames.filter((name) =>
    personnel.some(
      (person) =>
        person.locationId === personnelLocationId &&
        person.department === personnelDepartment &&
        (person.name || "").trim().toLowerCase() ===
          name.toLowerCase()
    )
  );

  if (duplicateNames.length > 0) {
    setError(
      `These staff names already exist: ${duplicateNames.join(", ")}`
    );
    return;
  }

  setPersonnelSaving(true);
  setError("");
  setSuccess("");

  try {
    const personnelCollection = collection(db, "personnel");

    await Promise.all(
      cleanStaffNames.map((name) =>
        addDoc(personnelCollection, {
          name,
          locationId: personnelLocationId,
          locationName: selectedFormLocation.name,
          department: personnelDepartment,
          createdAt: serverTimestamp(),
        })
      )
    );

    setSuccess(
      `${cleanStaffNames.length} personnel added successfully.`
    );

    // If the saved personnel belong to the currently selected
    // location and department, they will appear automatically.
    if (
      personnelLocationId === selectedLocationId &&
      personnelDepartment === selectedDepartment
    ) {
      setSelectedPersonnel("");
    }

    setShowPersonnelForm(false);
    setPersonnelLocationId("");
    setPersonnelDepartment("");
    setStaffNamesInput([""]);
  } catch (err) {
    console.error("Error saving personnel:", err);
    setError("Unable to save personnel. Please check Firestore permissions.");
  } finally {
    setPersonnelSaving(false);
  }
};

// =====================================
// CLOSE PERSONNEL FORM
// =====================================

const handleClosePersonnelForm = () => {
  if (personnelSaving) return;

  setShowPersonnelForm(false);
  setPersonnelLocationId("");
  setPersonnelDepartment("");
  setStaffNamesInput([""]);
  setError("");
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
      {error && !showAddForm && !showPersonnelForm && (
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
    <p>Select the unit or area where the observation will take place.</p>

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
    <p>Select the department from selected location.</p>

    <select
      id="department-select"
      value={selectedDepartment}
      onChange={(e) => {
  setSelectedDepartment(e.target.value);
  setSelectedPersonnel("");
}}
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

  {/* PERSONNEL OBSERVED */}
<div className="selection-field">
  <label htmlFor="personnel-select">
    Personnel Observed
  </label>
  <p>Select the healthcare worker being observed</p>

  <div className="location-select-row">
    <select
      id="personnel-select"
      value={selectedPersonnel}
      onChange={(e) => setSelectedPersonnel(e.target.value)}
      disabled={!selectedLocationId || !selectedDepartment}
    >
      <option value="">
        {!selectedLocationId
          ? "Select a location first"
          : !selectedDepartment
          ? "Select a department first"
          : filteredPersonnel.length === 0
          ? "No personnel available"
          : "Select Personnel"}
      </option>

      {filteredPersonnel.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name}
        </option>
      ))}
    </select>

    <button
      type="button"
      className="add-location-inline-btn"
      onClick={() => {
        setError("");
        setSuccess("");
        setShowPersonnelForm(true);
      }}
    >
      <span className="desktop-add-text">+ Add Personnel</span>
      <span className="mobile-add-text">+ Add</span>
    </button>
  </div>
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

      {/* ADD PERSONNEL MODAL */}
{showPersonnelForm && (
  <div
    className="location-modal-overlay"
    onClick={handleClosePersonnelForm}
  >
    <div
      className="location-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="location-modal-header">
        <div>
          <h2>Add Personnel</h2>
          <p>Select a location and department, then add staff names.</p>
        </div>

        <button
          type="button"
          className="close-modal-btn"
          onClick={handleClosePersonnelForm}
          disabled={personnelSaving}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSavePersonnel}>
        {/* LOCATION */}
        <div className="selection-field">
          <label htmlFor="personnel-location">
            Location
          </label>

          <select
            id="personnel-location"
            value={personnelLocationId}
            onChange={(e) => {
              setPersonnelLocationId(e.target.value);
              setPersonnelDepartment("");
              setError("");
            }}
            required
          >
            <option value="">Select Location</option>

            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* DEPARTMENT */}
        <div className="selection-field">
          <label htmlFor="personnel-department">
            Department
          </label>

          <select
            id="personnel-department"
            value={personnelDepartment}
            onChange={(e) => {
              setPersonnelDepartment(e.target.value);
              setError("");
            }}
            disabled={!personnelLocationId}
            required
          >
            <option value="">
              {personnelLocationId
                ? "Select Department"
                : "Select a location first"}
            </option>

            {personnelFormDepartments.map((department, index) => (
              <option key={`${department}-${index}`} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        {/* STAFF NAMES */}
        <div className="selection-field">
          <label>Staff Names</label>

          <div className="department-input-list">
            {staffNamesInput.map((name, index) => (
              <div className="department-input-row" key={index}>
                <input
                  type="text"
                  placeholder={`Staff Name ${index + 1}`}
                  value={name}
                  onChange={(e) =>
                    handleStaffNameChange(index, e.target.value)
                  }
                />

                {staffNamesInput.length > 1 && (
                  <button
                    type="button"
                    className="remove-department-btn"
                    onClick={() => handleRemoveStaffField(index)}
                    disabled={personnelSaving}
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
            onClick={handleAddStaffField}
            disabled={personnelSaving}
          >
            + Add Another Staff
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
            onClick={handleClosePersonnelForm}
            disabled={personnelSaving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-location-btn"
            disabled={personnelSaving}
          >
            {personnelSaving ? "Saving..." : "Save Personnel"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

    </div>
  );
}
