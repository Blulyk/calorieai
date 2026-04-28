import fs from 'fs'
import { mkdir, readFile, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'

const DB_DIR = process.env.DB_PATH || path.join(process.cwd(), 'data')
const DATA_UPLOADS_DIR = path.join(DB_DIR, 'uploads')
const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

export function uploadUrl(filename: string): string {
  return `/uploads/${path.basename(filename)}`
}

export function uploadCandidates(filenameOrPath: string): string[] {
  const filename = path.basename(filenameOrPath)
  return [
    path.join(DATA_UPLOADS_DIR, filename),
    path.join(PUBLIC_UPLOADS_DIR, filename),
  ]
}

export async function saveOptimizedUpload(file: File, prefix = 'meal'): Promise<string> {
  await mkdir(DATA_UPLOADS_DIR, { recursive: true })

  const filename = `${prefix}_${uuid()}.jpg`
  const target = path.join(DATA_UPLOADS_DIR, filename)
  const input = Buffer.from(await file.arrayBuffer())

  const output = await sharp(input)
    .rotate()
    .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer()

  await fs.promises.writeFile(target, output)
  return uploadUrl(filename)
}

export async function readUpload(filenameOrPath: string): Promise<{ buffer: Buffer; path: string } | null> {
  for (const candidate of uploadCandidates(filenameOrPath)) {
    try {
      return { buffer: await readFile(candidate), path: candidate }
    } catch {}
  }
  return null
}

export async function deleteUploadFile(photoPath: string | null) {
  if (!photoPath) return
  await Promise.all(uploadCandidates(photoPath).map(async candidate => {
    try { await unlink(candidate) } catch {}
  }))
}
