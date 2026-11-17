import SwiftUI

/// Phila design system colours. Light/dark values match tokens.json.
/// AccentColor asset: navy #28428C (Any) / gold #E8B774 (Dark).
public extension Color {
    static let philaNavy = Color(red: 0x28/255, green: 0x42/255, blue: 0x8C/255)
    static let philaGold = Color(red: 0xE8/255, green: 0xB7/255, blue: 0x74/255)
    /// Text on a gold fill — never white on gold.
    static let philaOnGold = Color(red: 0x14/255, green: 0x1B/255, blue: 0x2E/255)
    /// Dark ground (deep navy, not black).
    static let philaNight = Color(red: 0x0F/255, green: 0x15/255, blue: 0x24/255)
    static let tallyLive = Color(light: 0xC62F26, dark: 0xFF6B5F)
    static let tallyReady = Color(light: 0x1F7A4D, dark: 0x5FCF8E)
    static let philaGoldText = Color(light: 0x8A5A14, dark: 0xE8B774)
    static let philaNavyText = Color(light: 0x28428C, dark: 0x9DB3EC)

    init(light: UInt32, dark: UInt32) {
        #if canImport(AppKit)
        self.init(nsColor: NSColor(name: nil) { appearance in
            let hex = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light
            return NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                           blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
        })
        #else
        self.init(uiColor: UIColor { traits in
            let hex = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                           blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
        })
        #endif
    }
}
