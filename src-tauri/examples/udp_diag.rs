use std::net::UdpSocket;
use std::time::Duration;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    match args[1].as_str() {
        "a" => {
            let s = UdpSocket::bind(format!("{}:0", args[2])).unwrap();
            s.set_broadcast(true).unwrap();
            s.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
            eprintln!("A local={}", s.local_addr().unwrap());
            s.send_to(b"PING-DIAG", &args[3]).unwrap();
            eprintln!("A sent to {}", args[3]);
            let mut buf = [0u8; 64];
            match s.recv_from(&mut buf) {
                Ok((n, from)) => eprintln!("A RX {:?} from {from}", &buf[..n]),
                Err(e) => eprintln!("A RX TIMEOUT/ERR {e}"),
            }
        }
        "b" => {
            let s = UdpSocket::bind(format!("0.0.0.0:{}", args[2])).unwrap();
            s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
            let mut buf = [0u8; 64];
            match s.recv_from(&mut buf) {
                Ok((n, from)) => {
                    eprintln!("B RX {:?} from {from}", &buf[..n]);
                    s.send_to(b"PONG-DIAG", from).unwrap();
                    eprintln!("B replied");
                }
                Err(e) => eprintln!("B RX TIMEOUT/ERR {e}"),
            }
        }
        _ => eprintln!("usage: udp_diag a <bind_ip> <dest> | b <port>"),
    }
}
