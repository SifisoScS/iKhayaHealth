class ConflictResolver {
  static resolve(local, remote, strategy = 'timestamp') {
    switch (strategy) {
      case 'timestamp':
        return this.resolveByTimestamp(local, remote);
      case 'role':
        return this.resolveByRole(local, remote);
      case 'merge':
        return this.mergeRecords(local, remote);
      default:
        return local;
    }
  }

  static resolveByTimestamp(local, remote) {
    return new Date(local.updatedAt) > new Date(remote.updatedAt) ? local : remote;
  }

  static resolveByRole(local, remote) {
    const rolePriority = { doctor: 3, nurse: 2, admin: 1 };
    const localPriority = rolePriority[local.updatedBy?.role] || 0;
    const remotePriority = rolePriority[remote.updatedBy?.role] || 0;
    return localPriority >= remotePriority ? local : remote;
  }

  static mergeRecords(local, remote) {
    // Deep merge strategy
    return { ...remote, ...local, merged: true };
  }
}

module.exports = ConflictResolver;
