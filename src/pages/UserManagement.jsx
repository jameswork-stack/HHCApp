
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";

import { db, userCreationAuth } from "../firebase/firebase";
import "../styles/user-management.css";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    role: "staff",
  });

  // Listen to registered user accounts
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const userList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        userList.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
          const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
          return dateB - dateA;
        });

        setUsers(userList);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Error loading users:", err);
        setError("Unable to load user accounts. Check your Firestore permissions.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return "N/A";

    return timestamp.toDate().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const email = formData.email.trim().toLowerCase();
    const name = formData.name.trim();

    if (!email || !name || !formData.password || !formData.confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!["admin", "staff"].includes(formData.role)) {
      setError("Please select a valid account role.");
      return;
    }

    setSaving(true);

    let createdUser = null;

    try {
      // Create account using the separate Firebase Auth instance.
      // This keeps the current admin logged in.
      const userCredential = await createUserWithEmailAndPassword(
        userCreationAuth,
        email,
        formData.password
      );

      createdUser = userCredential.user;

      // Save the user's profile in Firestore
      await setDoc(doc(db, "users", createdUser.uid), {
        name,
        email,
        role: formData.role,
        createdAt: serverTimestamp(),
      });

      await signOut(userCreationAuth);

      setFormData({
        email: "",
        name: "",
        password: "",
        confirmPassword: "",
        role: "staff",
      });

      setSuccess("User account created successfully!");
    } catch (err) {
      console.error("Account creation error:", err);

      // Remove the newly created Auth account if saving its profile failed.
      if (createdUser) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error("Account cleanup error:", cleanupError);
          setError(
            "The authentication account was created, but its Firestore profile could not be saved. Check Firebase permissions and Authentication users."
          );
          setSaving(false);
          return;
        }
      }

      if (err.code === "auth/email-already-in-use") {
        setError("This email address is already registered.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must contain at least 6 characters.");
      } else if (err.code === "permission-denied") {
        setError("Permission denied. Make sure your admin has permission to create user profiles.");
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-management-page">
      <div className="user-management-header">
        <div>
          <h1>User Management</h1>
          <p>Create and manage system user accounts.</p>
        </div>

        <div className="user-total">
          <span>Total Accounts</span>
          <strong>{users.length}</strong>
        </div>
      </div>

      
{/* CREATE ACCOUNT HEADER */}
<div className="user-create-header">
  <div>
    <h2>User Accounts</h2>
    <p>Manage registered system users.</p>
  </div>

  <button
    type="button"
    className="user-create-button"
    onClick={() => {
      setShowCreateForm((previous) => !previous);
      setError("");
      setSuccess("");
    }}
  >
    {showCreateForm ? "Close Form" : "+ Create Account"}
  </button>
</div>

{/* CREATE ACCOUNT FORM */}
{showCreateForm && (
  <div className="user-form-card">
    <div className="user-section-heading">
      <h2>Create New Account</h2>
      <p>Enter the information to register a new user.</p>
    </div>

    <form onSubmit={handleCreateAccount}>
      <div className="user-form-grid">
        <div className="user-form-group">
          <label htmlFor="userName">Observer Name</label>
          <input
            id="userName"
            type="text"
            name="name"
            placeholder="Enter observer name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="user-form-group">
          <label htmlFor="userEmail">Email Address</label>
          <input
            id="userEmail"
            type="email"
            name="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="user-form-group">
          <label htmlFor="userPassword">Password</label>
          <input
            id="userPassword"
            type="password"
            name="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={handleChange}
            minLength={6}
            required
          />
        </div>

        <div className="user-form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <div className="user-form-group">
          <label htmlFor="userRole">Account Role</label>
          <select
            id="userRole"
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="user-message user-error">{error}</div>
      )}

      {success && (
        <div className="user-message user-success">{success}</div>
      )}

      <div className="user-form-actions">
        <button
          type="button"
          className="user-cancel-button"
          onClick={() => setShowCreateForm(false)}
        >
          Cancel
        </button>

        <button type="submit" disabled={saving}>
          {saving ? "Creating Account..." : "Save Account"}
        </button>
      </div>
    </form>
  </div>
)}


      {/* USER ACCOUNTS LIST */}
      <div className="user-list-card">
        <div className="user-section-heading">
          <h2>User Accounts</h2>
          <p>Registered users in your system.</p>
        </div>

        {loading ? (
          <div className="user-list-message">Loading accounts...</div>
        ) : users.length === 0 ? (
          <div className="user-list-message">
            No user accounts found.
          </div>
        ) : (
          <div className="user-table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Observer Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Date Created</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Observer Name">
                      <strong>{user.name || "N/A"}</strong>
                    </td>

                    <td data-label="Email Address">
                      {user.email || "N/A"}
                    </td>

                    <td data-label="Role">
                      <span
                        className={`user-role-badge ${
                          user.role === "admin"
                            ? "user-role-admin"
                            : "user-role-staff"
                        }`}
                      >
                        {user.role || "Unknown"}
                      </span>
                    </td>

                    <td data-label="Date Created">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
