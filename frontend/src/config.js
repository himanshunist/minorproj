const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_BASE_URL = apiUrl.replace(/\/$/, '');
export const HISTORY_KEY = 'ids-prediction-history-v1';
export const MAX_HISTORY_ENTRIES = 100;
export const MAX_BATCH_ROWS = 5000;

export const FEATURE_GROUPS = [
  {
    id: 'connection',
    title: 'Connection basics',
    subtitle: 'Protocol, service and byte counts',
    fields: [
      'duration', 'protocol_type', 'service', 'flag', 'src_bytes',
      'dst_bytes', 'land', 'wrong_fragment', 'urgent',
    ],
  },
  {
    id: 'content',
    title: 'Payload & login indicators',
    subtitle: 'Content-level signals from the connection',
    fields: [
      'hot', 'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell',
      'su_attempted', 'num_root', 'num_file_creations', 'num_shells',
      'num_access_files', 'num_outbound_cmds', 'is_host_login', 'is_guest_login',
    ],
  },
  {
    id: 'traffic',
    title: 'Two-second traffic window',
    subtitle: 'Repeated connections and error rates',
    fields: [
      'count', 'srv_count', 'serror_rate', 'srv_serror_rate', 'rerror_rate',
      'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate',
    ],
  },
  {
    id: 'host',
    title: 'Destination host statistics',
    subtitle: 'Historical behaviour toward the target host',
    fields: [
      'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate',
      'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
      'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
      'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
      'dst_host_srv_rerror_rate',
    ],
  },
];

export const FEATURE_DESCRIPTIONS = {
  duration: 'Length of the connection in seconds.',
  protocol_type: 'Transport protocol of the connection.',
  service: 'Network service on the destination port (for example http, telnet).',
  flag: 'Connection status flag reported by the TCP layer.',
  src_bytes: 'Number of data bytes sent from source to destination.',
  dst_bytes: 'Number of data bytes sent from destination to source.',
  land: '1 if source and destination addresses/ports are the same, else 0.',
  wrong_fragment: 'Number of wrong fragments in the connection.',
  urgent: 'Number of urgent packets.',
  hot: "Number of 'hot' indicators such as accessing system directories.",
  num_failed_logins: 'Number of failed login attempts.',
  logged_in: '1 if the connection represents a successful login, else 0.',
  num_compromised: 'Number of compromised conditions detected.',
  root_shell: '1 if a root shell was obtained, else 0.',
  su_attempted: "1 if a 'su root' command was attempted, else 0.",
  num_root: 'Number of root accesses.',
  num_file_creations: 'Number of file creation operations.',
  num_shells: 'Number of shell prompts.',
  num_access_files: 'Number of operations on access control files.',
  num_outbound_cmds: 'Number of outbound commands in an FTP session.',
  is_host_login: "1 if the login belongs to the 'hot' list, else 0.",
  is_guest_login: '1 if the login is a guest login, else 0.',
  count: 'Number of connections to the same host in the last two seconds.',
  srv_count: 'Number of connections to the same service in the last two seconds.',
  serror_rate: 'Percentage of connections with SYN errors.',
  srv_serror_rate: 'Percentage of same-service connections with SYN errors.',
  rerror_rate: 'Percentage of connections with REJ errors.',
  srv_rerror_rate: 'Percentage of same-service connections with REJ errors.',
  same_srv_rate: 'Percentage of connections to the same service.',
  diff_srv_rate: 'Percentage of connections to different services.',
  srv_diff_host_rate: 'Percentage of same-service connections to different hosts.',
  dst_host_count: 'Number of connections to the destination host in the last two seconds.',
  dst_host_srv_count: 'Number of connections to the same destination service.',
  dst_host_same_srv_rate: 'Percentage of connections to the same destination service.',
  dst_host_diff_srv_rate: 'Percentage of connections to different destination services.',
  dst_host_same_src_port_rate: 'Percentage of connections from the same source port.',
  dst_host_srv_diff_host_rate: 'Percentage of same-service connections to different hosts.',
  dst_host_serror_rate: 'Percentage of destination-host connections with SYN errors.',
  dst_host_srv_serror_rate: 'Percentage of destination-service connections with SYN errors.',
  dst_host_rerror_rate: 'Percentage of destination-host connections with REJ errors.',
  dst_host_srv_rerror_rate: 'Percentage of destination-service connections with REJ errors.',
};

export const CATEGORICAL_FIELDS = ['protocol_type', 'service', 'flag'];

// Real rows taken from kddcup.data_10_percent_corrected. Labels are deliberately
// omitted: the API decides the classification, the demo never hardcodes it.
export const EXAMPLE_RECORDS = {
  http_session: {
    duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF',
    src_bytes: 181, dst_bytes: 5450, land: 0, wrong_fragment: 0, urgent: 0,
    hot: 0, num_failed_logins: 0, logged_in: 1, num_compromised: 0,
    root_shell: 0, su_attempted: 0, num_root: 0, num_file_creations: 0,
    num_shells: 0, num_access_files: 0, num_outbound_cmds: 0,
    is_host_login: 0, is_guest_login: 0, count: 8, srv_count: 8,
    serror_rate: 0, srv_serror_rate: 0, rerror_rate: 0, srv_rerror_rate: 0,
    same_srv_rate: 1, diff_srv_rate: 0, srv_diff_host_rate: 0,
    dst_host_count: 9, dst_host_srv_count: 9, dst_host_same_srv_rate: 1,
    dst_host_diff_srv_rate: 0, dst_host_same_src_port_rate: 0.11,
    dst_host_srv_diff_host_rate: 0, dst_host_serror_rate: 0,
    dst_host_srv_serror_rate: 0, dst_host_rerror_rate: 0,
    dst_host_srv_rerror_rate: 0,
  },
  syn_flood_session: {
    duration: 0, protocol_type: 'tcp', service: 'telnet', flag: 'S0',
    src_bytes: 0, dst_bytes: 0, land: 0, wrong_fragment: 0, urgent: 0,
    hot: 0, num_failed_logins: 0, logged_in: 0, num_compromised: 0,
    root_shell: 0, su_attempted: 0, num_root: 0, num_file_creations: 0,
    num_shells: 0, num_access_files: 0, num_outbound_cmds: 0,
    is_host_login: 0, is_guest_login: 0, count: 6, srv_count: 5,
    serror_rate: 0.83, srv_serror_rate: 1, rerror_rate: 0,
    srv_rerror_rate: 0, same_srv_rate: 0.83, diff_srv_rate: 0.33,
    srv_diff_host_rate: 0, dst_host_count: 5, dst_host_srv_count: 6,
    dst_host_same_srv_rate: 1, dst_host_diff_srv_rate: 0,
    dst_host_same_src_port_rate: 0.2, dst_host_srv_diff_host_rate: 0.33,
    dst_host_serror_rate: 1, dst_host_srv_serror_rate: 0.83,
    dst_host_rerror_rate: 0, dst_host_srv_rerror_rate: 0,
  },
};
