import { useEffect, useState } from "react"

function Profile() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem("token")

    fetch("http://localhost:5000/api/profile", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setUser(data))
  }, [])

  if (!user) return <p>Loading...</p>

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  )
}

export default Profile