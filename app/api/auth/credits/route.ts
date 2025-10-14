import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const USERS_FOLDER = 'data/users'

// GET: Check free credits for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const userFile = path.join(USERS_FOLDER, `${username.toLowerCase()}.json`)
    
    try {
      const userData = await fs.readFile(userFile, 'utf-8')
      const user = JSON.parse(userData)

      return NextResponse.json({
        success: true,
        freeCredits: user.freeCredits || 0
      })
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error checking credits:', error)
    return NextResponse.json({ error: 'Failed to check credits' }, { status: 500 })
  }
}

// PUT: Use free credits (deduct when generating music)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, amount = 1 } = body

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const userFile = path.join(USERS_FOLDER, `${username.toLowerCase()}.json`)
    
    try {
      const userData = await fs.readFile(userFile, 'utf-8')
      const user = JSON.parse(userData)

      if ((user.freeCredits || 0) < amount) {
        return NextResponse.json({ error: 'Insufficient free credits' }, { status: 400 })
      }

      // Deduct credits
      user.freeCredits -= amount
      await fs.writeFile(userFile, JSON.stringify(user, null, 2))

      console.log(`💳 Used ${amount} free credit(s) for user ${username}. Remaining: ${user.freeCredits}`)

      return NextResponse.json({
        success: true,
        remainingCredits: user.freeCredits
      })
    } catch {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error using credits:', error)
    return NextResponse.json({ error: 'Failed to use credits' }, { status: 500 })
  }
}

