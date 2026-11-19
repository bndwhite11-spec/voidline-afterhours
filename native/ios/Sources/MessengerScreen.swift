import SwiftUI
import Combine
import WebKit
import UIKit

@MainActor
final class MessengerModel: ObservableObject {
    enum LoadState: Equatable { case loading, ready, failed(String) }
    @Published var state: LoadState = .loading
    @Published var notice: String?
    @Published var downloadedFile: DownloadedFile?
    @Published var downloading = false
    weak var webView: WKWebView?
    private var sharedTemporaryDirectory: URL?
    private static var clearedOldTemporaryFiles = false

    init() {
        // Run once per process, so a second scene cannot erase a live share.
        if !Self.clearedOldTemporaryFiles {
            Self.clearedOldTemporaryFiles = true
            let root = FileManager.default.temporaryDirectory
            let entries = (try? FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) ?? []
            for entry in entries where entry.lastPathComponent.hasPrefix("VOIDLINE-download-") {
                try? FileManager.default.removeItem(at: entry)
            }
        }
    }

    func retry() {
        state = .loading
        webView?.load(URLRequest(url: VoidlinePolicy.startURL))
    }

    func openInSafari() {
        UIApplication.shared.open(VoidlinePolicy.startURL)
    }

    func removeSharedTemporaryFile() {
        // SwiftUI may clear the sheet's binding before onDismiss runs.
        if let directory = sharedTemporaryDirectory { try? FileManager.default.removeItem(at: directory) }
        sharedTemporaryDirectory = nil
        downloadedFile = nil
    }

    func presentDownloadedFile(_ url: URL) {
        sharedTemporaryDirectory = url.deletingLastPathComponent()
        downloadedFile = DownloadedFile(url: url)
    }
}

struct DownloadedFile: Identifiable {
    let id = UUID()
    let url: URL
}

struct MessengerScreen: View {
    @StateObject private var model = MessengerModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack(alignment: .top) {
            Color(red: 0.055, green: 0.063, blue: 0.075).ignoresSafeArea()
            MessengerWebView(model: model)
                .ignoresSafeArea(.keyboard, edges: .bottom)
                .accessibilityHidden(scenePhase != .active)
            if model.state == .loading {
                ProgressView("Opening VOIDLINE…")
                    .padding(14).background(.regularMaterial).clipShape(RoundedRectangle(cornerRadius: 8))
            }
            if case .failed(let message) = model.state {
                VStack(alignment: .leading, spacing: 18) {
                    Text("VOIDLINE couldn’t load").font(.title2.weight(.semibold))
                    Text(message).foregroundStyle(.secondary)
                    Button("Try again", action: model.retry).buttonStyle(.borderedProminent)
                    Button("Open in Safari", action: model.openInSafari).buttonStyle(.bordered)
                }.padding(24).frame(maxWidth: 420).background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12)).padding(24)
            }
            if model.downloading {
                Text("Downloading file…").padding(12).background(.regularMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 8)).accessibilityAddTraits(.updatesFrequently)
            }
            if scenePhase != .active {
                Color(red: 0.055, green: 0.063, blue: 0.075).ignoresSafeArea()
                    .overlay(Text("VOIDLINE").font(.headline).foregroundStyle(.secondary))
            }
        }
        .sheet(item: $model.downloadedFile, onDismiss: model.removeSharedTemporaryFile) { file in
            VStack(alignment: .leading, spacing: 20) {
                Label("Download ready", systemImage: "doc")
                    .font(.title2.weight(.semibold))
                Text(file.url.lastPathComponent).foregroundStyle(.secondary)
                    .textSelection(.enabled)
                ShareLink(item: file.url) {
                    Label("Save or share file", systemImage: "square.and.arrow.up")
                }.buttonStyle(.borderedProminent)
                Button("Done") { model.removeSharedTemporaryFile() }
                    .buttonStyle(.bordered)
            }.padding(24).presentationDetents([.medium])
        }
        .alert("VOIDLINE", isPresented: Binding(get: { model.notice != nil }, set: { if !$0 { model.notice = nil } })) {
            Button("OK", role: .cancel) { model.notice = nil }
        } message: {
            Text(model.notice ?? "")
        }
    }
}

