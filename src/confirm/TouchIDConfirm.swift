import Foundation
import LocalAuthentication

/// CLI helper binary that triggers macOS Touch ID for payment confirmation.
/// Called by the Node.js CLI and returns JSON to stdout.
///
/// Usage: touchid-confirm --service "Linear" --amount "$8/mo" --method "Visa ****4242"
/// Returns: {"success": true} or {"success": false, "error": "..."}

struct TransactionDetails {
    let service: String
    let amount: String
    let paymentMethod: String

    var promptMessage: String {
        "Confirm \(amount) payment to \(service) using \(paymentMethod)"
    }
}

func parseArguments() -> TransactionDetails {
    let args = CommandLine.arguments
    var service = "Unknown Service"
    var amount = "$0.00"
    var method = "Payment Method"

    var i = 1
    while i < args.count {
        switch args[i] {
        case "--service":
            if i + 1 < args.count { service = args[i + 1]; i += 1 }
        case "--amount":
            if i + 1 < args.count { amount = args[i + 1]; i += 1 }
        case "--method":
            if i + 1 < args.count { method = args[i + 1]; i += 1 }
        default:
            break
        }
        i += 1
    }

    return TransactionDetails(service: service, amount: amount, paymentMethod: method)
}

func outputJSON(_ dict: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: dict),
       let str = String(data: data, encoding: .utf8) {
        print(str)
    }
}

func main() {
    let details = parseArguments()
    let context = LAContext()
    var error: NSError?

    // Check if biometrics are available
    guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
        // Fall back to device passcode
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            outputJSON(["success": false, "error": "No authentication method available: \(error?.localizedDescription ?? "unknown")"])
            exit(1)
        }

        // Use passcode fallback
        let semaphore = DispatchSemaphore(value: 0)
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: details.promptMessage) { success, authError in
            if success {
                outputJSON(["success": true, "service": details.service, "amount": details.amount])
            } else {
                outputJSON(["success": false, "error": authError?.localizedDescription ?? "Authentication failed"])
            }
            semaphore.signal()
        }
        semaphore.wait()
        exit(0)
    }

    // Use biometrics (Touch ID)
    let semaphore = DispatchSemaphore(value: 0)
    context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: details.promptMessage) { success, authError in
        if success {
            outputJSON(["success": true, "service": details.service, "amount": details.amount])
        } else {
            outputJSON(["success": false, "error": authError?.localizedDescription ?? "Authentication failed"])
        }
        semaphore.signal()
    }
    semaphore.wait()
}

main()
