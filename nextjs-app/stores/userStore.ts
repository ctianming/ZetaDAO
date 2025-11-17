import { create } from 'zustand'
import { Session } from 'next-auth'

// 定义我们关心的会话用户数据的子集
interface UserState {
  name?: string | null
  email?: string | null
  image?: string | null
  uid?: string | null
  isLoggedIn: boolean
  // 使用新的会话数据更新 store 的 action
  setSession: (session: Session | null) => void
  // 只更新头像的 action
  setAvatar: (imageUrl: string) => void
}

export const useUserStore = create<UserState>((set) => ({
  name: null,
  email: null,
  image: null,
  uid: null,
  isLoggedIn: false,
  setSession: (session: Session | null) => {
    if (session?.user) {
      set({
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        uid: (session.user as any).uid, // 假设 uid 是会话中 user 对象的一部分
        isLoggedIn: true,
      })
    } else {
      // 如果会话为 null（已登出），则重置为初始状态
      set({
        name: null,
        email: null,
        image: null,
        uid: null,
        isLoggedIn: false,
      })
    }
  },
  setAvatar: (imageUrl: string) => {
    set({ image: imageUrl })
  },
}))



