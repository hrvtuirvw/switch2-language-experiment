#!/usr/bin/env python3
"""Run one Switch 2 listener under a temporary exact-peer Linux nft INPUT lease.

Never sends console input. A failed/unknown START consumes its console boot.
Ctrl-C/TERM stops the child and removes only this supervisor's rule.
"""
import argparse
import ipaddress
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
PORT = 39380
child = None
stop_requested = False


def check(ok, reason):
    if not ok:
        raise RuntimeError('LAN listener: ' + reason)


def call(*argv):
    return subprocess.run(argv, check=True, capture_output=True, text=True, timeout=12).stdout


def nft(*args):
    return call('sudo', '-n', 'nft', *args)


def document():
    return json.loads(nft('-j', '-a', 'list', 'chain', 'ip', 'filter', 'INPUT'))


def chain(doc):
    return next(x['chain'] for x in doc['nftables'] if 'chain' in x and
                x['chain'].get('family') == 'ip' and x['chain'].get('table') == 'filter' and
                x['chain'].get('name') == 'INPUT')


def rules(doc):
    return [x['rule'] for x in doc['nftables'] if x.get('rule', {}).get('chain') == 'INPUT' and
            x['rule'].get('family') == 'ip' and x['rule'].get('table') == 'filter']


def check_peer(peer, host):
    p, h = ipaddress.ip_address(peer), ipaddress.ip_address(host)
    check(p.version == h.version == 4 and p.is_private and h.is_private and
          not p.is_loopback and not h.is_loopback and p != h, 'peer/host must be distinct private IPv4')
    routes = json.loads(call('ip', '-j', 'route', 'get', peer))
    check(len(routes) == 1 and routes[0].get('prefsrc', routes[0].get('src')) == host and
          isinstance(routes[0].get('dev'), str) and routes[0]['dev'] != 'lo',
          'host address is not the route to that peer')
    iface = routes[0]['dev']
    addresses = json.loads(call('ip', '-j', 'address', 'show', 'dev', iface))
    check(any(a.get('local') == host for row in addresses for a in row.get('addr_info', [])),
          'host address is not assigned to the peer interface')
    call('ping', '-n', '-I', iface, '-c', '2', '-W', '1', peer)
    neighbor = json.loads(call('ip', '-j', 'neigh', 'show', peer, 'dev', iface))
    check(len(neighbor) == 1 and neighbor[0].get('lladdr') and
          neighbor[0].get('state') not in ('FAILED', 'INCOMPLETE'), 'peer neighbor missing')
    return iface


def check_command(command, peer, host):
    if command and command[0] == '--':
        command = command[1:]
    check(len(command) >= 4 and command[0] == 'node' and
          command[1] in ('set-language.cjs', 'enable-english.cjs',
                         'restore-japanese.cjs', 'recovery/recover-owned-save.cjs'),
          'only the source language/recovery launchers are supported')
    check('--boot-id' in command and command.index('--boot-id') + 1 < len(command),
          'new one-use --boot-id is required')
    if command[1].startswith('recovery/'):
        check('--run' in command and '--peer-ip' in command and
              command[command.index('--peer-ip')+1] == peer and '--host-ip' in command and
              command[command.index('--host-ip')+1] == host, 'cleanup peer/host options differ')
    else:
        check(command[-1] == host, 'pass the same computer IP at the end of the Node command')
    check('--check-only' not in command, 'use Node check-only without a firewall lease')
    return command


def on_signal(sig, _frame):
    global stop_requested
    stop_requested = True
    if child is not None and child.poll() is None:
        try:
            os.killpg(child.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass


def main(argv=None):
    global child
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--peer-ip', required=True)
    parser.add_argument('--host-ip', required=True)
    parser.add_argument('--lease-smoke', action='store_true', help='no listener, journal, START, or console input')
    parser.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args(argv)
    check(sys.platform.startswith('linux'), 'this supervisor needs Linux nftables')
    iface = check_peer(args.peer_ip, args.host_ip)
    command = None if args.lease_smoke else check_command(args.command, args.peer_ip, args.host_ip)
    check(not call('ss', '-H', '-ltn', 'sport = :39380').strip(), 'listener already present')
    pre = document()
    check(chain(pre).get('policy') == 'drop', 'unexpected INPUT policy; do not modify it')
    baseline = [r['handle'] for r in rules(pre)]
    check(not any(str(r.get('comment', '')).startswith('ns2-exact-') for r in rules(pre)),
          'stale or competing lease; inspect it before another attempt')
    if command:
        call('node', 'run.cjs', '--check-only')
        recovery = call('node', 'recovery/recover-owned-save.cjs', '--check-only').strip()
        check(recovery == 'NO_PENDING_OWNED_SAVE_SCRATCH' if not command[1].startswith('recovery/')
              else recovery.startswith('{"pending":true,'), 'owned SAVE state not suitable for this mode')
    nonce = secrets.token_hex(16)
    comment = 'ns2-exact-' + nonce[:16]
    lease_dir = ROOT / 'firewall-leases'
    lease_dir.mkdir(mode=0o700, exist_ok=True)
    check(not lease_dir.is_symlink(), 'linked lease directory')
    receipt = lease_dir / (nonce + '.json')
    handle = None
    baseline_verified = False
    try:
        check(not stop_requested, 'interrupted before lease')
        nft('insert', 'rule', 'ip', 'filter', 'INPUT', 'iifname', iface,
            'ip', 'saddr', args.peer_ip, 'ip', 'daddr', args.host_ip,
            'tcp', 'dport', str(PORT), 'accept', 'comment', comment)
        owned = [r for r in rules(document()) if r.get('comment') == comment]
        check(len(owned) == 1 and [r['handle'] for r in rules(document())
                if r.get('comment') != comment] == baseline,
              'new exact rule not uniquely bound to baseline')
        handle = owned[0]['handle']
        payload = {'state': 'ACTIVE', 'peer': args.peer_ip, 'host': args.host_ip,
                   'iface': iface, 'port': PORT, 'comment': comment,
                   'handle': handle, 'baselineHandles': baseline}
        with receipt.open('x') as out:
            os.chmod(receipt, 0o600)
            json.dump(payload, out)
            out.write('\n')
        env = {**os.environ, 'NS2_FIREWALL_LEASE': str(receipt),
               'NS2_SWITCH_PEER': args.peer_ip, 'NODE_USE_ENV_PROXY': '0'}
        probe = "require('./lan-firewall.cjs').verify({host:process.argv[1],peer:process.argv[2]}).then(()=>console.log('EXACT_PEER_RULE_OK')).catch(e=>{console.error(e.message);process.exitCode=1})"
        check(subprocess.run(['node', '-e', probe, args.host_ip, args.peer_ip],
                             cwd=ROOT, env=env, check=True, capture_output=True,
                             text=True, timeout=12).stdout.strip() == 'EXACT_PEER_RULE_OK',
              'Node did not accept exact peer rule')
        if args.lease_smoke:
            print('EXACT_PEER_RULE_OK_NO_LISTENER_NO_START', flush=True)
            return
        signal.signal(signal.SIGINT, on_signal)
        signal.signal(signal.SIGTERM, on_signal)
        check(not stop_requested, 'interrupted before listener')
        child = subprocess.Popen(command, cwd=ROOT, env=env, start_new_session=True)
        try:
            code = child.wait(timeout=900)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=20)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait(timeout=10)
            raise RuntimeError('listener deadline expired; preserve run and never replay START')
        check(code == 0, 'host exited nonzero; inspect boot/run receipts; never replay an admitted START')
    finally:
        now = rules(document())
        owned = [r for r in now if r.get('comment') == comment]
        if handle is None and len(owned) == 1:
            handle = owned[0]['handle']
        if handle is not None:
            check(len(owned) == 1 and owned[0]['handle'] == handle,
                  'owned rule changed; manual firewall recovery required')
            nft('delete', 'rule', 'ip', 'filter', 'INPUT', 'handle', str(handle))
        check([r['handle'] for r in rules(document())] == baseline,
              'unrelated INPUT rules changed; preserve evidence')
        baseline_verified = True
        if receipt.exists():
            payload = json.loads(receipt.read_text())
            payload.update(state='ENDED', baselineRestored=True)
            receipt.write_text(json.dumps(payload, indent=2) + '\n')
        print('EXACT_PEER_FIREWALL_RESTORED', flush=True)
    check(baseline_verified, 'INPUT baseline not restored')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(error, file=sys.stderr)
        sys.exit(1)
