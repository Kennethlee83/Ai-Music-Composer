import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const USERS_FOLDER = 'data/users'

// Simple password hashing (matches register)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Find user file
    const userFile = path.join(USERS_FOLDER, `${username.toLowerCase()}.json`)
    
    try {
      const userData = await fs.readFile(userFile, 'utf-8')
      const user = JSON.parse(userData)

      // Check password
      const inputHash = hashPassword(password)
      if (user.passwordHash !== inputHash) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }

      // Return profile (without password hash)
      const { passwordHash, ...profile } = user

      return NextResponse.json({ 
        success: true, 
        profile,
        message: `Welcome back, ${user.username}!`
      })
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error logging in:', error)
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}

