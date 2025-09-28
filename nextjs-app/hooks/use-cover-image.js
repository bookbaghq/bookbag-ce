import {create} from 'zustand'

export const useConverImage = create()((set) => ({
  url:undefined,
  isOpen:false,
  onOpen:() => set({isOpen:true,url:undefined}),
  onClose:() => set({isOpen:false,url:undefined  }),
  onReplace:() => set({isOpen:true,url})
}))