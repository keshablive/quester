export type AuthView = 'signin' | 'signup' | 'forgot' | 'verify';

export interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: AuthView;
}
