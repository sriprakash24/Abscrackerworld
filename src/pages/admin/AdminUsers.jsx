import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Users as UsersIcon, Search, Pencil, Trash2, Phone, MapPin } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import AdminSectionHeader from '../../components/admin/AdminSectionHeader';
import AdminTabsNav from '../../components/admin/AdminTabsNav';
import UserFormModal from '../../components/admin/UserFormModal';
import ConfirmDeleteDialog from '../../components/admin/ConfirmDeleteDialog';
import { db } from '../../firebase/config';
import { subscribeAllUsers, deleteUserProfile } from '../../services/usersFirestore';
import { subscribeAllOrders } from '../../services/ordersFirestore';

function formatJoinedDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAddress(address) {
  if (!address) return '';
  return [address.houseNumber, address.street, address.area, address.city, address.district, address.state, address.pincode]
    .filter(Boolean)
    .join(', ');
}

export default function AdminUsers() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeAllUsers(
      db,
      (fetched) => {
        setUsers(fetched);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    // Users don't store an address themselves (no auth, just name + mobile
    // from the "who's shopping?" sheet) — so it's derived here from each
    // customer's most recent order/checkout address instead.
    const unsubscribe = subscribeAllOrders(db, setOrders, () => {});
    return () => unsubscribe?.();
  }, []);

  const statsByMobile = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      const mobile = order.customer?.mobile;
      if (!mobile) continue;
      const existing = map.get(mobile) || { orderCount: 0, latestAddress: '', latestCreatedAt: null };
      existing.orderCount += 1;
      const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt ? new Date(order.createdAt) : null;
      if (!existing.latestCreatedAt || (createdAt && createdAt > existing.latestCreatedAt)) {
        existing.latestCreatedAt = createdAt;
        existing.latestAddress = formatAddress(order.address);
      }
      map.set(mobile, existing);
    }
    return map;
  }, [orders]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout failed', err);
      toast.error('Could not sign out. Please try again.');
    }
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => [u.name, u.mobile].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [users, search]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserProfile(db, deleteTarget.id);
      toast.success('User deleted');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete user', err);
      toast.error("Couldn't delete the user. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-16 text-white">
      <AdminSectionHeader
        icon={UsersIcon}
        title="Users"
        subtitle={`${users.length} ${users.length === 1 ? 'user' : 'users'} total`}
        email={user?.email}
        onLogout={handleLogout}
      />
      <AdminTabsNav />

      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="surface-3d flex items-center gap-2 rounded-xl px-3.5 py-2.5">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or mobile…"
            className="w-full bg-transparent text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <UserRowSkeleton key={i} />)
          ) : filteredUsers.length === 0 ? (
            <div className="surface-3d rounded-2xl px-4 py-8 text-center text-[12px] text-muted">
              {search ? 'No users match your search.' : "No users yet — they'll show up here the moment someone shops for the first time."}
            </div>
          ) : (
            filteredUsers.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                stats={statsByMobile.get(u.mobile)}
                onEdit={() => {
                  setEditingUser(u);
                  setModalOpen(true);
                }}
                onDelete={() => setDeleteTarget(u)}
              />
            ))
          )}
        </div>
      </div>

      <UserFormModal open={modalOpen} user={editingUser} onClose={() => setModalOpen(false)} />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete this user?"
        description={`"${deleteTarget?.name || deleteTarget?.mobile}" will be permanently removed from the users list. Their past orders and invoices are unaffected.`}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function UserRow({ user, stats, onEdit, onDelete }) {
  return (
    <div className="surface-3d flex items-start gap-3 rounded-2xl p-3.5">
      <span className="orb-3d flex h-11 w-11 shrink-0 items-center justify-center !rounded-full text-[13px] font-extrabold text-orange">
        {(user.name || '?').trim().charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-[13px] font-bold text-[#f2ece2]">{user.name || 'Unnamed'}</p>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-muted">
            Joined {formatJoinedDate(user.createdAt)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-semibold text-muted">
          <Phone size={11} className="shrink-0 text-orange" />
          {user.mobile}
          <span className="text-muted/60">·</span>
          {stats?.orderCount ? `${stats.orderCount} order${stats.orderCount === 1 ? '' : 's'}` : 'No orders yet'}
        </div>

        {stats?.latestAddress && (
          <div className="mt-1 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#cfc7bd]">
            <MapPin size={11} className="mt-0.5 shrink-0 text-orange" />
            <span className="line-clamp-2">{stats.latestAddress}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button onClick={onEdit} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-orange">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="orb-3d flex h-8 w-8 items-center justify-center !rounded-full text-[#f2ece2] hover:text-[#e35226]">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function UserRowSkeleton() {
  return (
    <div className="surface-3d flex animate-pulse items-center gap-3 rounded-2xl p-3.5">
      <div className="h-11 w-11 shrink-0 rounded-full bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded bg-white/5" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}
