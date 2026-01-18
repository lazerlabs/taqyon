#include "backendobject.h"
#include <QDebug>

BackendObject::BackendObject(QObject *parent)
    : QObject(parent), m_message("Hello from C++ backend!"), m_count(0) {}

QString BackendObject::message() const {
    return m_message;
}

void BackendObject::setMessage(const QString &msg) {
    if (m_message != msg) {
        m_message = msg;
        emit messageChanged(m_message);
    }
}

int BackendObject::count() const {
    return m_count;
}

void BackendObject::setCount(int count) {
    if (m_count != count) {
        m_count = count;
        emit countChanged(m_count);
    }
}

void BackendObject::incrementCount() {
    setCount(m_count + 1);
}

void BackendObject::sendToBackend(const QString &text) {
    emit sendToFrontend(QString("Backend received: %1").arg(text));
}

