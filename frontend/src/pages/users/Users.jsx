import { useEffect, useState } from "react";
import { HiOutlineShieldCheck, HiOutlineUserAdd, HiOutlineTrash, HiOutlinePencil } from "react-icons/hi";
import { getUsers, createUser, updateUserRole, deleteUser } from "../../api/user.api";
import { Input, Select, Button, Modal, Badge } from "../../components/common";
import { useAuth } from "../../context/AuthContext";

const ROLES = ["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"];

const Users = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        role: "Dispatcher"
    });

    const fetchUsers = async () => {
        try {
            const res = await getUsers();
            // Backend returns { success, message, data: [...] }
            setUsers(res.data?.data || res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setErrorMsg("");
            await createUser(form);
            setIsModalOpen(false);
            setForm({ username: "", email: "", password: "", role: "Dispatcher" });
            fetchUsers();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            await updateUserRole(id, newRole);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update role");
        }
    };

    const handleDelete = async (id, username) => {
        if (currentUser?.username === username) {
            alert("You cannot delete your own account.");
            return;
        }
        if (!window.confirm(`Delete user ${username}?`)) return;
        try {
            await deleteUser(id);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete");
        }
    };

    const roleOptions = ROLES.map(r => ({ label: r, value: r }));

    return (
        <div className="animate-fade-in-up space-y-6 max-w-[1600px] mx-auto text-primary">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-2">
                    <HiOutlineShieldCheck className="text-accent w-5 h-5" />
                    <h1 className="font-bold text-lg tracking-tight">Role-Based Access Control</h1>
                </div>
                
                <Button onClick={() => setIsModalOpen(true)}>
                    <HiOutlineUserAdd className="w-4 h-4" /> Add User
                </Button>
            </div>

            {/* Matrix / List */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-sidebar">
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Username</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Role Assignment</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted text-sm">No users found.</td>
                                </tr>
                            ) : (
                                users.map((u) => {
                                    const isSelf = currentUser?.username === u.username;
                                    return (
                                        <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-primary">{u.username}</span>
                                                    {isSelf && <span className="bg-accent/20 text-accent text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">You</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    disabled={isSelf}
                                                    className="bg-background border border-border text-secondary text-xs rounded-md px-3 py-1.5 focus:outline-none focus:border-accent disabled:opacity-50 cursor-pointer"
                                                >
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-secondary">
                                                {new Date(u.created_at || Date.now()).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => handleDelete(u.id, u.username)} 
                                                        disabled={isSelf}
                                                        className="p-1.5 text-secondary hover:text-danger hover:bg-red-400/10 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary" 
                                                        title="Delete User"
                                                    >
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title="Create System User"
                footer={
                    <div className="flex gap-3 w-full">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
                        <Button type="submit" form="user-form" disabled={loading || !form.username || !form.email || !form.password} className="flex-1">
                            {loading ? "Creating..." : "Create User"}
                        </Button>
                    </div>
                }
            >
                <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {errorMsg && (
                        <div className="bg-danger/10 border border-red-500/20 text-danger text-sm p-3 rounded-lg">
                            <span className="font-semibold">Error:</span> {errorMsg}
                        </div>
                    )}
                    
                    <Input label="Username" name="username" placeholder="e.g. jdoe_dispatch" value={form.username} onChange={handleChange} required />
                    <Input label="Email" name="email" type="email" placeholder="e.g. jdoe@company.com" value={form.email} onChange={handleChange} required />
                    <Input label="Password" name="password" type="password" placeholder="Temporary password" value={form.password} onChange={handleChange} required />
                    <Select label="Role" name="role" value={form.role} onChange={handleChange} options={roleOptions} required />
                </form>
            </Modal>

        </div>
    );
};

export default Users;