import mongoose from 'mongoose';

export const scopeToUserDepartments = (req) => {
  if (!req.user) {
    return { _id: null };
  }

  let role = req.user.role;
  if (!role && req.user.email) {
    if (req.user.email.includes('dean')) role = 'dean';
    else if (req.user.email.includes('admin')) role = 'academic_admin';
    else if (req.user.email.includes('advisor')) role = 'advisor';
  }

  if (role === 'dean') {
    return {};
  }

  if (role === 'academic_admin') {
    const ids = req.user.departmentIds || [];
    if (ids.length === 0) return { _id: null };
    return { departmentId: { $in: ids.map(id => new mongoose.Types.ObjectId(id.toString())) } };
  }

  if (role === 'admin') {
    const ids = req.user.departmentIds || [];
    if (ids.length === 0) return { _id: null };
    return { departmentId: { $in: ids.map(id => new mongoose.Types.ObjectId(id.toString())) } };
  }

  if (role === 'advisor') {
    const ids = (req.user.assignedBatchIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length === 0) return { _id: null };
    return { batchId: { $in: ids } };
  }

  return { _id: null };
};

export const scopeBatchToUserDepartments = (req) => {
  if (!req.user) return { _id: null };
  if (req.user.role === 'dean') return {};
  const ids = req.user.departmentIds || [];
  if (ids.length === 0) return { _id: null };
  return { departmentId: { $in: ids.map(id => new mongoose.Types.ObjectId(id.toString())) } };
};

// Used for audit log and notification role-scoping
export const scopeQueryToRole = (user) => {
  if (!user) return { _id: null };

  if (user.role === 'dean') {
    return {};
  }

  if (user.role === 'academic_admin') {
    const ids = (user.departmentIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length === 0) return { _id: null };
    return { departmentId: { $in: ids } };
  }

  if (user.role === 'admin') {
    const deptId = user.departmentId || (user.departmentIds && user.departmentIds[0]);
    return { departmentId: deptId ? new mongoose.Types.ObjectId(deptId.toString()) : null };
  }

  if (user.role === 'advisor') {
    const ids = (user.assignedBatchIds || []).map(id => new mongoose.Types.ObjectId(id.toString()));
    if (ids.length === 0) return { _id: null };
    return { batchId: { $in: ids } };
  }

  return { _id: null };
};
