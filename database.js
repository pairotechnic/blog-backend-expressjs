import dotenv from "dotenv"
import mysql from 'mysql2/promise'

dotenv.config(); // Only required during development, because in production we directly enter the environment variables in VERCEL 

const db = await mysql.createConnection(process.env.DATABASE_URL)

export const checkUsernameExists = async (username) => {
  const sql = "SELECT * FROM blog_users WHERE username = ?";
  const values = [username];
  const [rows] = await db.query(sql, values);
  return rows.length > 0;
};

export const checkEmailExists = async (email) => {
  const sql = "SELECT * FROM blog_users WHERE email = ?";
  const values = [email];
  const [rows] = await db.query(sql, values);
  return rows.length > 0;
};

export const checkUserExists = async (user) => {
  const sql = "SELECT * FROM blog_users WHERE username = ? AND password = ?";
  const values = [user.username, user.password]
  const [rows] = await db.query(sql, values)
  return rows.length > 0
}

export const checkCurrentPasswordMatchesStored = async (username, password) => {
  const sql = "SELECT password FROM blog_users WHERE username = ?";
  const values = [username]
  const [rows] = await db.query(sql, values)
  return (rows[0].password == password) // Access the password property of rows[0] object
}

export const checkReaction = async (username, post_id) => {

  const sql = "SELECT reaction_type FROM blog_reactions WHERE reaction_username = ? AND post_id = ?"
  const values = [
    username,
    post_id
  ]
  const [rows] = await db.query(sql, values)
  if (rows[0]) {
    return ( rows[0].reaction_type )
  } else {
    return ("None")
  }

}

export const checkCommentReaction = async (username, comment_id) => {

  const sql = "SELECT reaction_type FROM blog_comments_reactions WHERE reaction_username = ? AND comment_id = ?"
  const values = [
    username,
    comment_id
  ]
  const [rows] = await db.query(sql, values)
  if (rows[0]) {
    return ( rows[0].reaction_type )
  } else {
    return ("None")
  }

}

export const checkEmailMatchesCurrent = async (email, username) => { // check if the submitted email is the same as the email already stored in the db for user with this username
  const sql = "SELECT email FROM blog_users WHERE username = ?"
  const values = [username]
  const [rows] = await db.query(sql, values)
  return (rows[0].email == email) // Check if email property of rows[0] object matches the email passed as a param
}
