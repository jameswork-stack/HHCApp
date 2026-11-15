
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
import { useAuth } from "../context/AuthContext";

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
const [showMomentOptions, setShowMomentOptions] = useState(false);
const [showReviewScreen, setShowReviewScreen] = useState(false);
const [submitting, setSubmitting] = useState(false);

const [personnelSaving, setPersonnelSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedMissedCategories, setExpandedMissedCategories] = useState([]);

  const [complianceDetermination, setComplianceDetermination] = useState("");

const [missedReasons, setMissedReasons] = useState([]);

const [otherMissedReason, setOtherMissedReason] = useState("");

  // =====================================
// MOMENT OF HYGIENE
// =====================================

const [selectedMoments, setSelectedMoments] = useState([]);

const hygieneMoments = [
  {
    id: "moment1",
    label: "Moment 1",
    description: "Before touching the patient",
  },
  {
    id: "moment2",
    label: "Moment 2",
    description: "Before clean/aseptic procedure",
  },
  {
    id: "moment3",
    label: "Moment 3",
    description: "After body fluid exposure risk",
  },
  {
    id: "moment4",
    label: "Moment 4",
    description: "After touching the patient",
  },
  {
    id: "moment5",
    label: "Moment 5",
    description: "After touching patient surroundings",
  },
];

const missedReasonCategories = [
  {
    category: "Availability/Access",
    reasons: [
      "Dispenser empty",
      "Dispenser broken/missing",
      "No sink/water",
      "Product out of stock",
      "Dispenser too far away",
    ],
  },
  {
    category: "Time/Workload",
    reasons: [
      "Patient emergency",
      "High workload/staffing shortage",
      "Moment occurred too quickly",
      "Multiple sequential tasks",
    ],
  },
  {
    category: "Knowledge/Training",
    reasons: [
      "Unaware of the 5 Moments",
      "Unsure when hand hygiene is indicated",
      "Insufficient training",
    ],
  },
  {
    category: "Behavior/Culture",
    reasons: [
      "Forgot in the moment",
      "Normalized non-compliance among peers",
      "Gloves worn as false substitute",
      "Low perceived risk",
    ],
  },
  {
    category: "Skin/Health",
    reasons: [
      "Dermatitis/skin irritation",
      "Allergy to product",
    ],
  },
  {
    category: "Environmental",
    reasons: [
      "Crowded/blocked workspace",
      "Patient isolation constraints",
      "Workflow interruption",
    ],
  },
  {
    category: "System/Policy",
    reasons: [
      "No prompt/reminder system",
      "Unclear unit protocol",
      "Lack of leadership enforcement",
    ],
  },
  {
    category: "Other",
    reasons: ["Other"],
  },
];

const { currentUser, userRole } = useAuth();

const observerName =
  currentUser?.name ||
  currentUser?.displayName ||
  currentUser?.fullName ||
  currentUser?.email ||
  "Unknown User";

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

const handleMissedCategoryToggle = (category) => {
  setExpandedMissedCategories((prev) =>
    prev.includes(category)
      ? prev.filter((item) => item !== category)
      : [...prev, category]
  );
};

// =====================================
// HANDLE MOMENT CHECKBOXES
// =====================================

const handleMomentChange = (momentId) => {
  setSelectedMoments((prev) =>
    prev.includes(momentId)
      ? prev.filter((id) => id !== momentId)
      : [...prev, momentId]
  );
};

const handleMissedReasonChange = (reason) => {
  setMissedReasons((prev) =>
    prev.includes(reason)
      ? prev.filter((item) => item !== reason)
      : [...prev, reason]
  );

  if (reason === "Other" && missedReasons.includes("Other")) {
    setOtherMissedReason("");
  }
};

const handleDeterminationChange = (value) => {
  setComplianceDetermination(value);
  setMissedReasons([]);
  setOtherMissedReason("");
  setExpandedMissedCategories([]);
};

// =====================================
// REVIEW OBSERVATION
// =====================================

const handleOpenReview = () => {
  setError("");

  if (!selectedLocationId) {
    setError("Please select a location.");
    return;
  }

  if (!selectedDepartment) {
    setError("Please select a department.");
    return;
  }

  if (!selectedPersonnel) {
    setError("Please select personnel observed.");
    return;
  }

  if (selectedMoments.length === 0) {
    setError("Please select at least one Moment of Hygiene.");
    return;
  }

  if (!complianceDetermination) {
    setError("Please select Complied or Missed.");
    return;
  }

  if (
    complianceDetermination === "Missed" &&
    missedReasons.length === 0
  ) {
    setError("Please select at least one reason for missed hand hygiene.");
    return;
  }

  if (
    complianceDetermination === "Missed" &&
    missedReasons.includes("Other") &&
    !otherMissedReason.trim()
  ) {
    setError("Please specify the Other reason.");
    return;
  }

  setShowReviewScreen(true);
};

// =====================================
// SUBMIT OBSERVATION TO FIRESTORE
// =====================================

const handleSubmitObservation = async () => {
  setSubmitting(true);
  setError("");

  try {
    const selectedPersonnelRecord = personnel.find(
      (person) => person.id === selectedPersonnel
    );

    const selectedMomentDetails = hygieneMoments
      .filter((moment) => selectedMoments.includes(moment.id))
      .map((moment) => ({
        id: moment.id,
        label: moment.label,
        description: moment.description,
      }));

    const selectedMissedReasons =
      complianceDetermination === "Missed"
        ? missedReasons.map((reason) => {
            const category = missedReasonCategories.find((group) =>
              group.reasons.includes(reason)
            );

            return {
              category: category?.category || "Other",
              reason,
            };
          })
        : [];

    const observationData = {
  observerId: currentUser?.uid || "",
  observerName: observerName,
  observerEmail: currentUser?.email || "",
  observerRole: userRole || "",

  locationId: selectedLocationId,
  locationName: selectedLocation?.name || "",
  department: selectedDepartment,
  personnelId: selectedPersonnel,
  personnelName: selectedPersonnelRecord?.name || "",

  // Keep your other existing fields below 

  // =====================================
  // OBSERVER ACCOUNT INFORMATION
  // =====================================

  observerId: currentUser?.uid || "",
  observerName: observerName,
  observerEmail: currentUser?.email || "",
  observerRole: userRole || "",

  // =====================================
  // LOCATION INFORMATION
  // =====================================

  locationId: selectedLocationId,
  locationName: selectedLocation?.name || "",

      department: selectedDepartment,

      personnelId: selectedPersonnel,
      personnelName: selectedPersonnelRecord?.name || "",

      moments: selectedMomentDetails,

      complianceDetermination,

      complianceDescription:
        complianceDetermination === "Complied"
          ? "Hand hygiene was performed using alcohol-based hand rub or soap and water."
          : "",

      missedReasons: selectedMissedReasons,

      otherMissedReason:
        complianceDetermination === "Missed" &&
        missedReasons.includes("Other")
          ? otherMissedReason.trim()
          : "",

      createdAt: serverTimestamp(),
    };

    await addDoc(
      collection(db, "complianceObservations"),
      observationData
    );

    

    // Reset observation form after successful saving
    setSelectedLocationId("");
    setSelectedDepartment("");
    setSelectedPersonnel("");
    setSelectedMoments([]);

    setComplianceDetermination("");
    setMissedReasons([]);
    setOtherMissedReason("");

    setExpandedMissedCategories([]);
    setShowMomentOptions(false);

    setShowReviewScreen(false);

    setSuccess("Compliance observation submitted successfully!");

  } catch (err) {
    console.error("Error submitting observation:", err);

    setError(
      "Unable to submit observation. Please check your Firestore permissions and try again."
    );
  } finally {
    setSubmitting(false);
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

// =====================================
// REVIEW SCREEN
// =====================================

if (showReviewScreen) {
  const reviewPersonnel = personnel.find(
    (person) => person.id === selectedPersonnel
  );

  const reviewMoments = hygieneMoments.filter(
    (moment) => selectedMoments.includes(moment.id)
  );

  return (
    <div className="compliance-page">

      <div className="compliance-header">
        <div>
          <h1>Review Observation</h1>
          <p>
            Please review all information before submitting.
          </p>
        </div>
      </div>

      {error && (
        <div className="compliance-error">
          {error}
        </div>
      )}


      <div className="review-observation-card">

        {/* LOCATION INFORMATION */}
        <div className="review-section">

          <h3>Observation Information</h3>

          <div className="review-information-grid">

            {/* OBSERVER */}
  <div className="review-information-item">
    <span>Observer Name</span>
    <strong>{observerName}</strong>
  </div>

            <div className="review-information-item">
              <span>Location</span>
              <strong>{selectedLocation?.name || "N/A"}</strong>
            </div>

            <div className="review-information-item">
              <span>Department</span>
              <strong>{selectedDepartment || "N/A"}</strong>
            </div>

            <div className="review-information-item">
              <span>Personnel Observed</span>
              <strong>{reviewPersonnel?.name || "N/A"}</strong>
            </div>

          </div>

        </div>

        <div className="review-divider" />

        {/* MOMENT OF HYGIENE */}
        <div className="review-section">

          <h3>Moment of Hygiene</h3>

          <div className="review-selected-list">

            {reviewMoments.map((moment) => (
              <div
                className="review-selected-item"
                key={moment.id}
              >
                <span className="review-check-icon">✓</span>

                <div>
                  <strong>{moment.label}</strong>
                  <p>{moment.description}</p>
                </div>
              </div>
            ))}

          </div>

        </div>

        <div className="review-divider" />

        {/* COMPLIANCE DETERMINATION */}
        <div className="review-section">

          <h3>Compliance Determination</h3>

          <div className={`review-determination ${
            complianceDetermination === "Complied"
              ? "review-complied"
              : "review-missed"
          }`}>
            {complianceDetermination === "Complied"
              ? "✓ Complied"
              : "✕ Missed"}
          </div>

          {complianceDetermination === "Complied" && (
            <div className="review-description">
              <strong>Hand Hygiene Performed</strong>
              <p>
                Hand hygiene was performed using alcohol-based
                hand rub or soap and water.
              </p>
            </div>
          )}

          {/* MISSED REASONS */}
          {complianceDetermination === "Missed" && (
            <div className="review-missed-list">

              <h4>
                What hindered or contributed to the missed
                hand hygiene opportunity?
              </h4>

              {missedReasonCategories.map((group) => {
                const selectedGroupReasons = group.reasons.filter(
                  (reason) => missedReasons.includes(reason)
                );

                if (selectedGroupReasons.length === 0) {
                  return null;
                }

                return (
                  <div
                    className="review-reason-category"
                    key={group.category}
                  >

                    <strong>{group.category}</strong>

                    <ul>
                      {selectedGroupReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>

                  </div>
                );
              })}

              {missedReasons.includes("Other") && (
                <div className="review-other-reason">
                  <strong>Other Explanation</strong>
                  <p>{otherMissedReason}</p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* REVIEW ACTIONS */}
        <div className="review-actions">

          <button
            type="button"
            className="back-to-edit-btn"
            onClick={() => {
              setError("");
              setShowReviewScreen(false);
            }}
            disabled={submitting}
          >
            ← Back to Edit
          </button>

          <button
            type="button"
            className="submit-observation-btn"
            onClick={handleSubmitObservation}
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Observation"}
          </button>

        </div>

      </div>

    </div>
  );
}

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
      1. Location
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
      2. Department
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
    3. Personnel Observed
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

{/* MOMENT OF HYGIENE */}
<div className="selection-field moment-selection-field">

  <label>4. Moment of Hygiene</label>

  <button
    type="button"
    className={`moment-dropdown-toggle ${
      showMomentOptions ? "expanded" : ""
    }`}
    onClick={() => setShowMomentOptions((prev) => !prev)}
  >
    <span>
      {selectedMoments.length === 0
        ? "Select Moment of Hygiene"
        : `${selectedMoments.length} moment(s) selected`}
    </span>

    <span className={`category-arrow ${
      showMomentOptions ? "rotated" : ""
    }`}>
      ▼
    </span>
  </button>

  {showMomentOptions && (
    <div className="moment-checkbox-list">

      {hygieneMoments.map((moment) => (
        <label
          key={moment.id}
          className={`moment-checkbox-item ${
            selectedMoments.includes(moment.id) ? "selected" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={selectedMoments.includes(moment.id)}
            onChange={() => handleMomentChange(moment.id)}
          />

          <span className="moment-checkbox-content">
            <strong>{moment.label}*</strong>
            <span>{moment.description}</span>
          </span>
        </label>
      ))}

    </div>
  )}

  <p className="moment-selection-count">
    {selectedMoments.length} of 5 moments selected
  </p>

</div>

  {/* COMPLIANCE DETERMINATION */}
<div className="selection-field determination-field">

  <label>5. Compliance Determination</label>

  {/* COMPLIED / MISSED BUTTONS */}
  <div className="determination-buttons">

    <button
      type="button"
      className={`determination-btn complied-btn ${
        complianceDetermination === "Complied" ? "active" : ""
      }`}
      onClick={() => handleDeterminationChange("Complied")}
    >
      <span>✓</span>
      Complied
    </button>

    <button
      type="button"
      className={`determination-btn missed-btn ${
        complianceDetermination === "Missed" ? "active" : ""
      }`}
      onClick={() => handleDeterminationChange("Missed")}
    >
      <span>✕</span>
      Missed
    </button>

  </div>

  {/* COMPLIED DESCRIPTION */}
  {complianceDetermination === "Complied" && (
    <div className="determination-description complied-description">
      <strong>Hand Hygiene Performed</strong>
      <p>
        Hand hygiene was performed using alcohol-based hand rub
        or soap and water.
      </p>
    </div>
  )}

  {/* MISSED REASONS */}
  {complianceDetermination === "Missed" && (
    <div className="missed-reasons-container">

      <p className="missed-reasons-instruction">
        What hindered or contributed to the missed hand hygiene
        opportunity? Select all that apply.
      </p>

      <div className="missed-reasons-list">

        {missedReasonCategories.map((group) => {
          const isExpanded = expandedMissedCategories.includes(
            group.category
          );

          const selectedCount = group.reasons.filter((reason) =>
            missedReasons.includes(reason)
          ).length;

          return (
            <div className="missed-reason-group" key={group.category}>

              {/* CATEGORY HEADER */}
              <button
                type="button"
                className={`missed-category-toggle ${
                  isExpanded ? "expanded" : ""
                }`}
                onClick={() =>
                  handleMissedCategoryToggle(group.category)
                }
              >
                <span className="missed-category-title">
                  {group.category}

                  {selectedCount > 0 && (
                    <span className="category-selected-count">
                      {selectedCount}
                    </span>
                  )}
                </span>

                <span
                  className={`category-arrow ${
                    isExpanded ? "rotated" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {/* CATEGORY OPTIONS */}
              {isExpanded && (
                <div className="missed-reason-options">

                  {group.reasons.map((reason) => (
                    <label
                      key={reason}
                      className={`missed-reason-option ${
                        missedReasons.includes(reason)
                          ? "selected"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={missedReasons.includes(reason)}
                        onChange={() =>
                          handleMissedReasonChange(reason)
                        }
                      />

                      <span>{reason}</span>
                    </label>
                  ))}

                </div>
              )}

            </div>
          );
        })}

      </div>

      {/* OTHER DESCRIPTION */}
      {missedReasons.includes("Other") && (
        <div className="other-reason-field">

          <label htmlFor="other-missed-reason">
            Please specify other reason
          </label>

          <textarea
            id="other-missed-reason"
            value={otherMissedReason}
            onChange={(e) =>
              setOtherMissedReason(e.target.value)
            }
            placeholder="Enter the reason..."
            rows={3}
          />

        </div>
      )}

      <p className="missed-reason-count">
        {missedReasons.length} reason(s) selected
      </p>

    </div>
  )}

</div>

{/* REVIEW AND SUBMIT BUTTON */}
<div className="compliance-form-actions">

  <button
    type="button"
    className="review-observation-btn"
    onClick={handleOpenReview}
  >
    Review & Submit
    <span>→</span>
  </button>

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
