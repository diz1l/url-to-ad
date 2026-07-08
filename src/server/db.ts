import { createClient } from '@supabase/supabase-js'
import type { Ad, Project, ProjectStatus } from '../lib/schemas'

function getClient() {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_KEY']
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  return createClient(url, key)
}

export async function createProject(url: string): Promise<Project> {
  const db = getClient()
  const { data, error } = await db
    .from('projects')
    .insert({ url, status: 'pending' })
    .select()
    .single()
  if (error) throw new Error(`DB createProject: ${error.message}`)
  return data as Project
}

export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
  extra?: Partial<Pick<Project, 'error_message' | 'brand_profile' | 'image_candidates' | 'metrics'>>,
): Promise<void> {
  const db = getClient()
  const { error } = await db
    .from('projects')
    .update({ status, ...extra })
    .eq('id', id)
  if (error) throw new Error(`DB updateProjectStatus: ${error.message}`)
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getClient()
  const { data, error } = await db.from('projects').select('*').eq('id', id).single()
  if (error) return null
  return data as Project
}

export async function getProjectWithAds(
  id: string,
): Promise<{ project: Project; ads: Ad[] } | null> {
  const db = getClient()
  const [{ data: project, error: pe }, { data: ads, error: ae }] = await Promise.all([
    db.from('projects').select('*').eq('id', id).single(),
    db.from('ads').select('*').eq('project_id', id).order('position'),
  ])
  if (pe || !project) return null
  if (ae) throw new Error(`DB getAds: ${ae.message}`)
  return { project: project as Project, ads: (ads ?? []) as Ad[] }
}

export async function insertAds(
  projectId: string,
  drafts: Array<{
    idea: string
    primary_text: string
    headline: string
    description: string
    cta: string
    image_url: string | null
    position: number
  }>,
): Promise<Ad[]> {
  const db = getClient()
  const rows = drafts.map((d) => ({ ...d, project_id: projectId }))
  const { data, error } = await db.from('ads').insert(rows).select()
  if (error) throw new Error(`DB insertAds: ${error.message}`)
  return data as Ad[]
}

export async function updateAd(
  adId: string,
  fields: Partial<Pick<Ad, 'primary_text' | 'headline' | 'description' | 'cta' | 'image_url'>>,
): Promise<Ad> {
  const db = getClient()
  const { data, error } = await db
    .from('ads')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .select()
    .single()
  if (error) throw new Error(`DB updateAd: ${error.message}`)
  return data as Ad
}

export async function getAd(adId: string): Promise<Ad | null> {
  const db = getClient()
  const { data, error } = await db.from('ads').select('*').eq('id', adId).single()
  if (error) return null
  return data as Ad
}

export async function getAdsByProject(projectId: string): Promise<Ad[]> {
  const db = getClient()
  const { data, error } = await db
    .from('ads')
    .select('*')
    .eq('project_id', projectId)
    .order('position')
  if (error) throw new Error(`DB getAdsByProject: ${error.message}`)
  return (data ?? []) as Ad[]
}

export async function replaceAd(
  adId: string,
  fields: Pick<Ad, 'idea' | 'primary_text' | 'headline' | 'description' | 'cta' | 'image_url'>,
): Promise<Ad> {
  const db = getClient()
  const { data, error } = await db
    .from('ads')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', adId)
    .select()
    .single()
  if (error) throw new Error(`DB replaceAd: ${error.message}`)
  return data as Ad
}
