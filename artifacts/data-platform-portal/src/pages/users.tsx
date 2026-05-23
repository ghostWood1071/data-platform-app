import { useState } from "react";
import { useGetUsers, useCreateUser, useUpdateUser, useToggleUserStatus } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MOCK_USERS } from "@/data/mock";
import { UserPlus, MoreHorizontal, Edit, Shield, CheckCircle, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@workspace/api-client-react";

export default function Users() {
  const { data, isLoading } = useGetUsers();
  const toggleMutation = useToggleUserStatus();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { toast } = useToast();
  
  const users = data || MOCK_USERS;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    role: "viewer",
    password: ""
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      fullName: "",
      email: "",
      role: "viewer",
      password: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      password: ""
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const isEnabling = currentStatus !== "active";
    try {
      await toggleMutation.mutateAsync({ id, data: { enabled: isEnabling } });
      toast({ title: `User ${isEnabling ? 'enabled' : 'disabled'} successfully` });
    } catch (e) {
      toast({ title: "Updated user status (Mock)", description: "Backend not connected." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateMutation.mutateAsync({
          id: editingUser.id,
          data: {
            fullName: formData.fullName,
            email: formData.email,
            role: formData.role
          }
        });
        toast({ title: "User updated successfully" });
      } else {
        await createMutation.mutateAsync({
          data: {
            username: formData.username,
            fullName: formData.fullName,
            email: formData.email,
            role: formData.role,
            password: formData.password
          }
        });
        toast({ title: "User created successfully" });
      }
      setIsModalOpen(false);
    } catch (error) {
      toast({ 
        title: `${editingUser ? 'Updated' : 'Created'} user (Mock)`, 
        description: "Backend not connected." 
      });
      setIsModalOpen(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "platform_admin":
        return <Badge variant="default" className="bg-primary hover:bg-primary">Admin</Badge>;
      case "cluster_admin":
        return <Badge variant="secondary">Cluster Admin</Badge>;
      case "data_engineer":
        return <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-500/10">Data Engineer</Badge>;
      case "analyst":
        return <Badge variant="outline" className="text-purple-600 border-purple-600/30 bg-purple-500/10">Analyst</Badge>;
      default:
        return <Badge variant="outline">Viewer</Badge>;
    }
  };

  return (
    <ProtectedRoute permission="user.view">
      <Layout>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
            <p className="text-muted-foreground">Manage platform access and permissions</p>
          </div>
          <Button className="gap-2" onClick={openCreateModal}>
            <UserPlus size={16} />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-lg">Platform Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.fullName}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openEditModal(user)}>
                                <Edit size={14} /> Edit details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === "active" ? (
                                <DropdownMenuItem 
                                  className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10"
                                  onClick={() => handleToggleStatus(user.id, user.status)}
                                >
                                  <XCircle size={14} /> Disable user
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="cursor-pointer gap-2 text-emerald-600 focus:bg-emerald-500/10"
                                  onClick={() => handleToggleStatus(user.id, user.status)}
                                >
                                  <CheckCircle size={14} /> Enable user
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit User Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? "Update user details and roles." 
                    : "Add a new user to the platform and assign their role."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    disabled={!!editingUser}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_admin">Platform Admin</SelectItem>
                      <SelectItem value="cluster_admin">Cluster Admin</SelectItem>
                      <SelectItem value="data_engineer">Data Engineer</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingUser ? "Save changes" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
