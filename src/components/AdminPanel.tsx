import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase-config';
import { isAdmin } from '../lib/admin';
import { cn } from '../lib/utils';
import type { User } from '../types/firestore';

export function AdminPanel() {
  const [user] = useAuthState(auth);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<(User & { id: string })[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<(User & { id: string })[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  // Check if current user is admin
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      const adminStatus = await isAdmin(user.uid);
      setIsUserAdmin(adminStatus);
      setLoading(false);
    };

    checkAdmin();
  }, [user]);

  // Load users
  useEffect(() => {
    if (!isUserAdmin) return;

    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const allUsers: (User & { id: string })[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as User & { id: string }));

        setPendingUsers(allUsers.filter((u) => !u.approved && !u.isAdmin));
        setApprovedUsers(allUsers.filter((u) => u.approved || u.isAdmin));
      },
      (error) => {
        console.error('Error loading users:', error);
      }
    );

    return () => unsubscribe();
  }, [isUserAdmin]);

  const handleApprove = async (userId: string) => {
    if (!isUserAdmin) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        approved: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user. Please try again.');
    }
  };

  const handleReject = async (userId: string) => {
    if (!isUserAdmin) return;

    if (!confirm('Are you sure you want to reject this user? They will not be able to access the app.')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        approved: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-textMuted">Please log in to access the admin panel.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <div className="flex items-center gap-3 text-textMuted">
          <div className="animate-spin">⚙️</div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isUserAdmin) {
    return (
      <div className="bg-surface border border-surfaceLight rounded-lg p-6">
        <p className="text-red-400">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const displayUsers = filter === 'pending' ? pendingUsers : filter === 'approved' ? approvedUsers : [...pendingUsers, ...approvedUsers];

  return (
    <div className="bg-surface border border-surfaceLight rounded-lg p-6">
      <h2 className="text-2xl font-bold text-text mb-4">Admin Panel</h2>
      <p className="text-textMuted mb-6 text-sm">
        Manage user approvals. Users must be approved before they can access the app.
      </p>

      {/* Filter Buttons */}
      <div className="mb-4 flex gap-2">
        {(['pending', 'approved', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-sm rounded transition-colors',
              filter === f
                ? 'bg-accent text-background font-semibold'
                : 'bg-background border border-surfaceLight text-text hover:border-accent'
            )}
          >
            {f === 'pending' ? `Pending (${pendingUsers.length})` : f === 'approved' ? `Approved (${approvedUsers.length})` : 'All Users'}
          </button>
        ))}
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {displayUsers.length === 0 ? (
          <p className="text-textMuted text-center py-8">No users found.</p>
        ) : (
          displayUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                'p-4 rounded border',
                user.approved || user.isAdmin
                  ? 'bg-background border-surfaceLight'
                  : 'bg-background border-yellow-500/30'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-text">
                      {user.firstName} {user.lastName}
                    </h3>
                    {user.isAdmin && (
                      <span className="px-2 py-1 text-xs bg-accent text-background rounded">Admin</span>
                    )}
                    {user.approved && !user.isAdmin && (
                      <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">Approved</span>
                    )}
                    {!user.approved && !user.isAdmin && (
                      <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">Pending</span>
                    )}
                  </div>
                  <p className="text-textMuted text-sm mb-1">@{user.handle}</p>
                  <p className="text-textMuted text-xs">{user.email}</p>
                  <p className="text-textMuted text-xs mt-1">
                    Joined: {user.createdAt?.toDate?.().toLocaleDateString() || 'Unknown'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!user.approved && !user.isAdmin && (
                    <>
                      <button
                        onClick={() => handleApprove(user.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {user.approved && !user.isAdmin && (
                    <button
                      onClick={() => handleReject(user.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

