'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SessionDishPage() {
  const { dishId } = useParams()
  const router = useRouter()
  useEffect(() => { router.replace(`/library/${dishId}`) }, [dishId])
  return null
}
