#include "app_setup.h"
#include <QCoreApplication>
#include <QFileInfo>
#include <QDir>
#include <QDebug>
#include <QStandardPaths>

void setupCommandLineParser(QCommandLineParser &parser)
{
    parser.setApplicationDescription("Taqyon Desktop Application");
    parser.addHelpOption();
    parser.addVersionOption();

    QCommandLineOption verboseOption(QStringList() << "verbose", "Enable verbose output");
    parser.addOption(verboseOption);

    QCommandLineOption logFileOption(QStringList() << "l" << "log", "Write logs to <file>", "file");
    parser.addOption(logFileOption);

    QCommandLineOption devServerOption(QStringList() << "d" << "dev-server", "Connect to dev server at <url>", "url", "http://127.0.0.1:5173");
    parser.addOption(devServerOption);

    QCommandLineOption frontendPathOption(QStringList() << "f" << "frontend-path", "Path to frontend dist directory", "path");
    parser.addOption(frontendPathOption);
}

AppOptions parseCommandLine(QCommandLineParser &parser)
{
    AppOptions options;
    options.verbose = parser.isSet("verbose");
    options.logFilePath = parser.isSet("log") ? parser.value("log") : QString();
    options.devServerUrl = parser.isSet("dev-server") ? parser.value("dev-server") : QString();
    options.frontendPath = parser.isSet("frontend-path") ? parser.value("frontend-path") : QString();
    return options;
}

void setupLogging(const AppOptions &options, QFile *&logFile)
{
    logFile = nullptr;
    if (!options.logFilePath.isEmpty()) {
        logFile = new QFile(options.logFilePath);
        if (logFile->open(QIODevice::WriteOnly | QIODevice::Text | QIODevice::Append)) {
            qInfo() << "Logging to file:" << options.logFilePath;
        } else {
            qWarning() << "Could not open log file for writing:" << options.logFilePath;
            delete logFile;
            logFile = nullptr;
        }
    }
}

QUrl resolveFrontendUrl(const QCommandLineParser &parser)
{
    if (parser.isSet("dev-server")) {
        QString devServerUrl = parser.value("dev-server");
        qInfo() << "Loading frontend from dev server:" << devServerUrl;
        return QUrl(devServerUrl);
    }

    QString frontendPath;
    if (parser.isSet("frontend-path")) {
        frontendPath = parser.value("frontend-path");
        qInfo() << "Using provided frontend path:" << frontendPath;
    } else {
        frontendPath = QCoreApplication::applicationDirPath() + "/../src/dist";
        QDir frontendDir(frontendPath);
        if (!frontendDir.exists()) {
            QStringList possiblePaths = {
                QCoreApplication::applicationDirPath() + "/src/dist",
                QDir::currentPath() + "/src/dist",
                QDir::currentPath() + "/../src/dist",
                QDir::currentPath() + "/../../src/dist",
                QDir::currentPath() + "/../../../src/dist"
            };
            bool found = false;
            for (const QString &path : possiblePaths) {
                QDir dir(path);
                if (dir.exists()) {
                    frontendPath = path;
                    found = true;
                    qInfo() << "Found frontend at:" << frontendPath;
                    break;
                }
            }
            if (!found) {
                qCritical() << "Could not find frontend directory in any of the expected locations.";
                qInfo() << "Please specify the frontend path with --frontend-path option.";
                return QUrl();
            }
        }
    }

    QString indexPath = frontendPath + "/index.html";
    QFileInfo indexFile(indexPath);
    if (!indexFile.exists()) {
        qCritical() << "index.html not found at:" << indexPath;
        qInfo() << "Make sure you've built the frontend with 'npm run frontend:build'";
        return QUrl();
    }
    qInfo() << "Loading frontend from:" << indexPath;
    return QUrl::fromLocalFile(indexPath);
}
