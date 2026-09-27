export function extractClientIdFromDepartmentRequest(request: any): number | null {
  const raw =
    request?.clientId ??
    request?.visit?.client?.id ??
    request?.visit?.client?.clientId ??
    request?.client?.id ??
    request?.client?.clientId ??
    null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function normalizeClientRecord(raw: any): any {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const source = raw.client ?? raw.data ?? raw;
  if (!source || typeof source !== 'object') {
    return {};
  }

  const pick = (...keys: string[]): any => {
    for (const key of keys) {
      const val = source[key];
      if (val != null && String(val).trim() !== '') {
        return val;
      }
    }
    return '';
  };

  return {
    ...source,
    id: source.id ?? source.clientId ?? null,
    clientId: source.clientId ?? source.id ?? null,
    clientFirstName: pick('clientFirstName', 'firstName', 'client_first_name'),
    clientSecondName: pick('clientSecondName', 'secondName', 'lastName', 'client_second_name'),
    clientProfilePic: pick('clientProfilePic', 'profilePic', 'client_profile_pic'),
    clientFileNo: pick('clientFileNo', 'fileNo', 'clientFileNumber', 'client_file_no'),
    clientContact: pick('clientContact', 'phone', 'clientPhone', 'client_contact'),
    clientGender: pick('clientGender', 'gender', 'client_gender'),
    clientAddress: pick('clientAddress', 'address', 'client_address'),
    clientAge: pick('clientAge', 'age', 'client_age'),
    clientDateOfBirth: pick('clientDateOfBirth', 'dateOfBirth', 'client_date_of_birth'),
    clientOccupation: pick('clientOccupation', 'occupation', 'client_occupation'),
    nextOfKinName: pick('nextOfKinName', 'nextOfKinsName', 'next_of_kin_name', 'nextOfKin'),
    nextOfKinContact: pick('nextOfKinContact', 'nextOfKinsContact', 'next_of_kin_contact'),
    nextOfKinAddress: pick('nextOfKinAddress', 'nextOfKinsAddress', 'next_of_kin_address'),
    relationship: pick('relationship'),
    diagnosis: pick('diagnosis'),
  };
}

export function buildClientDisplayName(source: any): string {
  const normalized = normalizeClientRecord(source);
  const fullName = `${normalized.clientFirstName || ''} ${normalized.clientSecondName || ''}`.trim();
  if (fullName) {
    return fullName;
  }
  const combined = (
    source?.clientName ||
    source?.fullName ||
    source?.name ||
    source?.visit?.clientName ||
    ''
  ).toString().trim();
  return combined;
}
