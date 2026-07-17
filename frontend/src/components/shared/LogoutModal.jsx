import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button as MuiButton
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';

// Maps internal role values to the label shown in the confirmation text.
// Keep this in sync with any other role-label maps in the app (e.g. RolesPermissions.jsx).
const ROLE_LABELS = {
    dean: 'Dean',
    academic_admin: 'Administrator',
    admin: 'HOD',
    advisor: 'Batch Advisor'
};

export default function LogoutModal({ open, onClose, onConfirm, role }) {
    const roleLabel = ROLE_LABELS[role] || 'BatchMinder';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            sx={{ '& .MuiDialog-paper': { borderRadius: '24px', padding: '16px', maxWidth: '380px', width: '100%' } }}
        >
            <DialogTitle style={{ fontWeight: 'bold', fontSize: '18px', color: '#1B3A6B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle style={{ color: '#EF4444' }} /> Confirm Log Out
            </DialogTitle>
            <DialogContent>
                <DialogContentText style={{ fontSize: '14px', color: '#64748b' }}>
                    Are you sure you want to end your BatchMinder {roleLabel} session?
                </DialogContentText>
            </DialogContent>
            <DialogActions style={{ padding: '8px 24px 16px' }}>
                <MuiButton onClick={onClose} style={{ color: '#64748b', textTransform: 'none', fontWeight: '600', fontSize: '14px' }}>
                    Cancel
                </MuiButton>
                <MuiButton
                    onClick={onConfirm}
                    style={{ backgroundColor: '#EF4444', color: '#ffffff', textTransform: 'none', fontWeight: '600', fontSize: '14px', padding: '6px 20px', borderRadius: '12px' }}
                >
                    Log Out
                </MuiButton>
            </DialogActions>
        </Dialog>
    );
}