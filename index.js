// npm install express mysql2 cors nodemon sequelize jsonwebtoken bcryptjs
// check dependencies in package.json

import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import mysql from 'mysql2/promise'

import {
  checkUsernameExists,
  checkEmailExists,
  checkUserExists,
  checkCurrentPasswordMatchesStored,
  checkReaction,
  checkCommentReaction,
  checkEmailMatchesCurrent
} from './database.js'

// dotenv.config(); // Only required during development, because in production we directly enter the environment variables in VERCEL 

// const PORT = process.env.PORT
// const DATABASE_URL = process.env.DATABASE_URL

// console.log("PORT value received from .env : " + PORT)
// console.log("DATABASE_URL value received from .env : " + DATABASE_URL)

const checkIsEqual = (param1, param2) => {
  return (param1 == param2)
}

const checkIsBlank = (param) => {
  return (param == "")
}

const getCurrentDateTime = () => {
  const currentDateTime = new Date()
  const currentDateTimeForMySql = currentDateTime.toISOString().slice(0, 19).replace('T', ' ')
  return currentDateTimeForMySql
}

const app = express()

app.use(cors())
app.use(express.json())

const db = await mysql.createConnection(process.env.DATABASE_URL)

app.get('/planetscale', (req, res) => {
  res.json({ msg: 'This test endpoint /planetscale is working' })
})

app.post('/signup', async (req, res) => {

  const formState = req.body

  // conduct validations to check if username or email already exists in db

  try {

    const isFirstNameBlank = checkIsBlank(formState.first_name)
    const isLastNameBlank = checkIsBlank(formState.last_name)
    const isUsernameBlank = checkIsBlank(formState.username)
    const usernameExists = await checkUsernameExists(formState.username)
    const isEmailBlank = checkIsBlank(formState.email)
    const emailExists = await checkEmailExists(formState.email)
    const isPasswordBlank = checkIsBlank(formState.password)
    const confirmPasswordMatchesPassword = checkIsEqual(formState.password, formState.confirm_password)

    if (isFirstNameBlank || isLastNameBlank || isUsernameBlank || isEmailBlank || isPasswordBlank || usernameExists || emailExists || !confirmPasswordMatchesPassword) {
      return res.status(400).json({
        first_name: isFirstNameBlank ? "First Name can't be blank" : "",
        last_name: isLastNameBlank ? "Last Name can't be blank" : "",
        username: isUsernameBlank ? "Username can't be blank" : (usernameExists ? "This username already exists" : ""),
        email: isEmailBlank ? "Email can't be blank" : (emailExists ? "This email already exists" : ""),
        password: isPasswordBlank ? "Password can't be blank" : "",
        confirm_password: !confirmPasswordMatchesPassword ? "Re-entered password doesn't match password" : ""
      })
    }

    else {
      const sql = "INSERT INTO blog_users (`first_name`, `last_name`, `username`, `email`, `password`) VALUES (?, ?, ?, ?, ?)" // Use backticks (`) around identifiers (like table or column names), not single quotes (').

      const values = [
        formState.first_name,
        formState.last_name,
        formState.username,
        formState.email,
        formState.password,
      ]

      await db.execute(sql, values);
      return res.status(201).json({ message: "Registration successful message from backend" });

    }

  } catch (error) {
    // console.error(error);
    console.error(error.stack); // Add this line
    return res.status(500).json({ error: 'An error occurred' });
  }

})

app.post('/login', async (req, res) => {

  const formState = req.body

  try {

    const userExists = await checkUserExists(formState)

    if (userExists) {
      return res.status(200).json({ message: "User exists and login successful, message from backend" });
    } else {
      return res.status(400).json({ error: 'Either username or password is incorrect' });
    }

  } catch (error) {
    console.error(error.stack);
    return res.status(500).json({ error: 'An error occurred in the backend' });
  }

})

app.post('/Users', async (req, res) => {

  const searchVal = req.body.searchVal
  // console.log("searchVal : " + searchVal)
  // console.log("searchVal : " + JSON.stringify(searchVal))

  if (searchVal){
    
    const sql = "SELECT username FROM blog_users WHERE username LIKE ?"
    const values = [`${searchVal}%`]
    const [rows] = await db.query(sql, values)
    console.log("rows : " + JSON.stringify(rows))
    return res.status(200).json(rows)

  } else {
    return res.status(200).json([])
  }

})

app.get('/Account/:username', async (req, res) => {

  const username = req.params.username;

  const sql = "SELECT * FROM blog_users WHERE username = ?"
  const values = [username]
  const [rows] = await db.query(sql, values)
  return res.status(200).json(rows[0])

})

app.post('/UpdateAccount/:username', async (req, res) => {

  const username = req.params.username;
  const formState = req.body

  try {

    const isFirstNameBlank = checkIsBlank(formState.first_name)
    const isLastNameBlank = checkIsBlank(formState.last_name)
    const isEmailBlank = checkIsBlank(formState.email)
    const emailExists = await checkEmailExists(formState.email)
    const emailMatchesCurrent = await checkEmailMatchesCurrent(formState.email, username)
    const emailTakenByOtherUser = emailExists && !emailMatchesCurrent

    if (isFirstNameBlank || isLastNameBlank || isEmailBlank || emailTakenByOtherUser) {
      return res.status(400).json({
        first_name: isFirstNameBlank ? "First Name can't be left blank" : "",
        last_name: isLastNameBlank ? "Last Name can't be left blank" : "",
        email: isEmailBlank ? "Email can't be left blank" : (emailTakenByOtherUser ? "This Email is taken by another user" : "")
      })
    }

    else {
      const sql = "UPDATE blog_users SET first_name = ?, last_name = ?, email = ? WHERE username = ?"
      const values = [
        formState.first_name,
        formState.last_name,
        formState.email,
        username
      ]
      await db.execute(sql, values)
      return res.status(200).json({ message: "Account Details updated successfully, message from backend" })
    }

  } catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: "An error occurred, message from backend" })
  }

})

app.post('/ChangePassword/:username', async (req, res) => {

  // console.log("req.body" + req.body); // Add this line
  const username = req.params.username;
  const formState = req.body

  // conduct validations to check if username or email already exists in db

  try {
    const currentPasswordMatchesStored = await checkCurrentPasswordMatchesStored(username, formState.currentPassword)
    const newPasswordMatchesCurrent = checkIsEqual(formState.newPassword, formState.currentPassword)
    const confirmPasswordMatchesNew = checkIsEqual(formState.confirmPassword, formState.newPassword)

    if (!currentPasswordMatchesStored) {
      // intentionally check these conditions in sequential order, instead of parallelly, 
      // because it doesn't matter if new password matches the entered current password, if the entered current password doesn't match the stored password
      // and even then, it doesn't matter if the re entered new password matches the new password, if the new password matches the current password
      return res.status(400).json({ error: 'Incorrect current password' })
    } else if (currentPasswordMatchesStored && newPasswordMatchesCurrent) {
      return res.status(400).json({ error: "New Password can't be same as current password" })
    } else if (!newPasswordMatchesCurrent && !confirmPasswordMatchesNew) {
      return res.status(400).json({ error: "Re-entered password doesn't match new password" })
    }

    else {
      const sql = "UPDATE blog_users SET password = ? WHERE username = ?"
      const values = [
        formState.newPassword,
        username
      ]
      await db.execute(sql, values)
      return res.status(200).json({ message: "Password updated successfully" })
    }

  } catch (error) {
    // console.error(error);
    console.error(error.stack); // Add this line
    return res.status(500).json({ error: 'An error occurred' });
  }

})

app.post('/CreateBlog/:username', async (req, res) => {

  const username = req.params.username
  const formState = req.body

  try {

    const isTitleBlank = checkIsBlank(formState.title)
    const currentDateTime = getCurrentDateTime()

    if (isTitleBlank) { // list all possible errors in if condition
      return res.status(400).json({
        title: isTitleBlank ? "Title can't be blank" : "",
        body: ""
      })
    }

    else {
      // const sql = "INSERT INTO blog_posts (`title`, `body`, `author_username`, `post_datetime`, `likes`, `dislikes`, `comments`) VALUES (?, ?, ?, ?, ?, ?, ?)"
      const sql = "INSERT INTO blog_posts (`title`, `body`, `author_username`, `post_datetime`, `comments`) VALUES (?, ?, ?, ?, ?)"

      const values = [
        formState.title,
        formState.body,
        username,
        currentDateTime,
        // 0,
        // 0,
        0
      ]

      await db.execute(sql, values)
      return res.status(201).json({ message: "Blog posted successfuly message from backend" })

    }

  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: "An error occurred" })
  }

})

app.get('/Blogs', async (req, res) => {

  try {
    const sql = "SELECT * FROM blog_posts ORDER BY post_datetime DESC " // TODO : only load latest 20 posts, then if you scroll to the bottom, load 20 more
    const [rows] = await db.execute(sql)
    return res.status(200).json(rows)
  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: "An error occurred" })
  }

})

app.get('/Blogs/:username', async (req, res) => {

  const username = req.params.username;

  try {
    // const sql = "SELECT * FROM blog_posts WHERE author_username = ? ORDER BY post_datetime DESC LIMIT 10"
    const sql = "SELECT * FROM blog_posts WHERE author_username = ? ORDER BY post_datetime DESC "
    const values = [username]
    const [rows] = await db.query(sql, values)
    return res.status(200).json(rows)
  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: "An error occurred" })
  }

})

app.get('/Comments/:username', async (req, res) => {

  const username = req.params.username;

  try {
    const sql = "SELECT * FROM blog_comments WHERE commenter_username = ? ORDER BY comment_datetime DESC "
    const values = [username]
    const [rows] = await db.query(sql, values)
    return res.status(200).json(rows)
  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: "An error occurred" })
  }

})

app.post('/CreateComment', async (req, res) => {

  const username = req.body.currentUser
  const post_id = req.body.post_id
  const inputComment = req.body.inputComment

  try {

    const currentDateTime = getCurrentDateTime()

    console.log(username + post_id + inputComment + currentDateTime)

    // const sql = "INSERT INTO blog_comments (`body`, `post_id`, `commenter_username`, `comment_datetime`, `likes`, `dislikes`) VALUES (?, ?, ?, ?, ?, ?)"
    const sql = "INSERT INTO blog_comments (`body`, `post_id`, `commenter_username`, `comment_datetime`) VALUES (?, ?, ?, ?)"

    const values = [
      inputComment,
      post_id,
      username,
      currentDateTime,
      // 0,
      // 0
    ]

    await db.execute(sql, values)

    const sql2 = "UPDATE blog_posts SET comments = comments + 1 WHERE post_id = ?"
    const values2 = [post_id]
    await db.execute(sql2, values2)

    return res.status(201).json({ message: "Comment posted successfuly message from backend" })

  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: error })
  }

})

app.post('/Comments', async (req, res) => {

  const post_id = req.body.post_id;

  console.log("/Comments console log")

  try {
    const sql = "SELECT * FROM blog_comments WHERE post_id = ? ORDER BY comment_datetime DESC"
    const values = [post_id]
    const [rows] = await db.execute(sql, values)
    console.log("comments from database : " + rows )
    return res.status(200).json(rows)
  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error : "An error occurred" })
  }

})

app.get('/Blog/:post_id', async (req, res) => {

  const post_id = req.params.post_id
  console.log("/Blog/:post_id console log ")

  try {
    const sql = "SELECT * FROM blog_posts WHERE post_id = ?"
    const values = [post_id]
    const [rows] = await db.query(sql, values)
    console.log(rows[0])
    return res.status(200).json(rows[0])
  }

  catch (error) {
    console.log(error.stack)
    return res.status(500).json({ error: error.message })
  }

})

app.post('/CurrentReaction', async (req, res) => {

  const username = req.body.currentUser
  const post_id = req.body.post_id

  // console.log(post_id)

  const stored_reaction = await checkReaction(username, post_id)
  // console.log(stored_reaction)

  return res.status(200).json(stored_reaction)

})

app.post('/LikeDislikeCount', async (req, res) => {

  const post_id = req.body.post_id
  // const post_id = 3

  // console.log(post_id)

  // const sql = "SELECT * FROM blog_reactions WHERE post_id = ? AND reaction_type = 'Like"
  const sql1 = "SELECT COUNT(*) FROM blog_reactions WHERE post_id = ? AND reaction_type = 'Like'"
  const sql2 = "SELECT COUNT(*) FROM blog_reactions WHERE post_id = ? AND reaction_type = 'Dislike'"

  const values = [post_id]

  const [rows1] = await db.query(sql1, values)
  const [rows2] = await db.query(sql2, values)

  // return {
  //   like_count : rows1,
  //   dislike_count : rows2
  // }

  return res.status(200).json({
    like_count : rows1[0]['count(*)'],
    dislike_count : rows2[0]['count(*)']
  })

})

app.post('/processReaction', async (req, res) => {

  const username = req.body.username
  const post_id = req.body.post_id
  const clicked_reaction = req.body.clickedReaction

  let sql = ""
  let values = []

  try {

    const stored_reaction = await checkReaction(username, post_id)

    if (stored_reaction === "None") {

      sql = "INSERT INTO blog_reactions (`reaction_username`, `post_id`, `reaction_type`) VALUES (?, ?, ?)"
      values = [
        username,
        post_id,
        clicked_reaction
      ]

    } else if (stored_reaction === clicked_reaction) {

      sql = "DELETE FROM blog_reactions WHERE reaction_username = ? AND post_id = ? "
      values = [
        username,
        post_id
      ]

    } else if (stored_reaction !== clicked_reaction) {

      sql = "UPDATE blog_reactions SET reaction_type = ? WHERE reaction_username = ? AND post_id = ?"
      values = [
        clicked_reaction,
        username,
        post_id
      ]

    }

    await db.execute(sql, values)

    return res.status(200).json({})

  }

  catch (error) {
    console.error("Error ading reaction : ", error)
    return res.status(500).json({ error: "Failed to process reaction" })
  }

})

app.post('/CurrentCommentReaction', async (req, res) => {

  const username = req.body.currentUser
  const comment_id = req.body.comment_id

  // console.log(post_id)

  const stored_reaction = await checkCommentReaction(username, comment_id)
  // console.log(stored_reaction)

  return res.status(200).json(stored_reaction)

})

app.post('/CommentLikeDislikeCount', async (req, res) => {

  const comment_id = req.body.comment_id

  const sql1 = "SELECT COUNT(*) FROM blog_comments_reactions WHERE comment_id = ? AND reaction_type = 'Like'"
  const sql2 = "SELECT COUNT(*) FROM blog_comments_reactions WHERE comment_id = ? AND reaction_type = 'Dislike'"

  const values = [comment_id]

  const [rows1] = await db.query(sql1, values)
  const [rows2] = await db.query(sql2, values)

  return res.status(200).json({
    like_count : rows1[0]['count(*)'],
    dislike_count : rows2[0]['count(*)']
  })

})

app.post('/processCommentReaction', async (req, res) => {

  const username = req.body.username
  const comment_id = req.body.comment_id
  const clicked_reaction = req.body.clicked_reaction

  let sql = ""
  let values = []

  try {

    const stored_reaction = await checkCommentReaction(username, comment_id)

    if (stored_reaction === "None") {

      sql = "INSERT INTO blog_comments_reactions (`reaction_username`, `comment_id`, `reaction_type`) VALUES (?, ?, ?)"
      values = [
        username,
        comment_id,
        clicked_reaction
      ]

    } else if (stored_reaction === clicked_reaction) {

      sql = "DELETE FROM blog_comments_reactions WHERE reaction_username = ? AND comment_id = ? "
      values = [
        username,
        comment_id
      ]

    } else if (stored_reaction !== clicked_reaction) {

      sql = "UPDATE blog_comments_reactions SET reaction_type = ? WHERE reaction_username = ? AND comment_id = ?"
      values = [
        clicked_reaction,
        username,
        comment_id
      ]

    }

    await db.execute(sql, values)
    // return res.status(200).json(updated_comment_reaction_count)
    return res.status(200).json({})

  }

  catch (error) {
    console.error("Error ading reaction : ", error)
    return res.status(500).json({ error: "Failed to process reaction" })
  }

})

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`)
})


// TODO : 

