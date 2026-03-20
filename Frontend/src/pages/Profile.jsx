import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2 } from "lucide-react";

function Profile() {

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");   // ⭐ redirect if not logged in
      return;
    }

    fetch("http://localhost:5000/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.log(err));

  }, []);

  if (!user) return <p className="text-white p-10">Loading...</p>;

  return (
    <div className="min-h-screen bg-black text-white px-10 py-10">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-12">

        <div
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-2xl font-bold text-red-500 cursor-pointer"
        >
          <Code2 /> AlgoForge
        </div>

      </div>

      {/* PROFILE CARD */}
      <div className="bg-zinc-900 border border-red-900/30 rounded-2xl p-10 w-[400px]">

        <img
          src={user.picture}
          alt="profile"
          className="w-28 h-28 rounded-full border-4 border-red-500 mb-6"
        />

        <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
        <p className="text-zinc-400">{user.email}</p>

      </div>

    </div>
  );
}

export default Profile;