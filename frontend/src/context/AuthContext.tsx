// frontend/src/context/AuthContext.tsx
'use client'

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type Profile = {
    id: string
    role: string
    full_name?: string
    email?: string
    [key: string]: unknown
}

type AuthContextType = {
    user: User | null
    profile: Profile | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
})

const PROTECTED_PREFIXES = ['/requester', '/volunteer', '/admin']

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    async function fetchProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Error fetching profile:', error)
            return null
        }
        return data as Profile
    }

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                const prof = await fetchProfile(currentUser.id)
                setProfile(prof)
            }
            setLoading(false)
        })

        // Listen to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user ?? null
                setUser(currentUser)

                if (currentUser) {
                    const prof = await fetchProfile(currentUser.id)
                    setProfile(prof)
                } else {
                    setProfile(null)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // Redirect unauthenticated users away from protected routes
    useEffect(() => {
        if (loading) return
        const isProtected = PROTECTED_PREFIXES.some(prefix =>
            pathname.startsWith(prefix)
        )
        if (isProtected && !user) {
            router.replace('/login')
        }
    }, [user, loading, pathname, router])

    async function signOut() {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        router.replace('/login')
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}